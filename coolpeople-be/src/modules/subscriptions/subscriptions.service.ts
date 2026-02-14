/**
 * Subscriptions Service
 * Business logic for subscription management with Stripe integration
 */

import Stripe from 'stripe';
import { prisma } from '../../lib/prisma.js';
import { stripe } from '../../lib/stripe.js';
import { env } from '../../config/env.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import type {
  CreateSubscriptionRequest,
  SubscriptionResponse,
  DiscountCodeResponse,
  CheckoutSessionResponse,
  CustomerPortalResponse,
} from './subscriptions.types.js';

// -----------------------------------------------------------------------------
// Pricing (in cents)
// -----------------------------------------------------------------------------

const PRICING: Record<string, Record<string, number>> = {
  premium:  { monthly: 1000, annual: 9600 },
  privacy:  { monthly: 2000, annual: 19200 },
  adfree:   { monthly: 3000, annual: 28800 },
};

const TIER_NAMES: Record<string, string> = {
  premium: 'Premium',
  privacy: 'Premium Privacy',
  adfree:  'Ad Free',
};

// -----------------------------------------------------------------------------
// Helper: Check if subscription is active
// -----------------------------------------------------------------------------

const isSubscriptionActive = (endDate: Date | null): boolean => {
  if (!endDate) return true; // No end date = active
  return endDate > new Date();
};

// -----------------------------------------------------------------------------
// Helper: Format subscription for API response
// -----------------------------------------------------------------------------

const formatSubscription = (sub: any): SubscriptionResponse => ({
  id: sub.id,
  tier: sub.tier,
  billingCycle: sub.billingCycle,
  startDate: sub.startDate,
  endDate: sub.endDate,
  isActive: isSubscriptionActive(sub.endDate),
});

// -----------------------------------------------------------------------------
// Get Current Subscription
// -----------------------------------------------------------------------------

export const getSubscription = async (
  userId: string
): Promise<SubscriptionResponse | null> => {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!sub) return null;
  return formatSubscription(sub);
};

// -----------------------------------------------------------------------------
// Get or Create Stripe Customer
// -----------------------------------------------------------------------------

const getOrCreateStripeCustomer = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, stripeCustomerId: true },
  });

  if (!user) throw new NotFoundError('User');

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.displayName,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
};

// -----------------------------------------------------------------------------
// Create Checkout Session
// -----------------------------------------------------------------------------

export const createCheckoutSession = async (
  userId: string,
  data: CreateSubscriptionRequest
): Promise<CheckoutSessionResponse> => {
  const { tier, billingCycle, discountCode } = data;

  const priceInCents = PRICING[tier]?.[billingCycle];
  if (!priceInCents) {
    throw new ValidationError('Invalid tier or billing cycle');
  }

  const customerId = await getOrCreateStripeCustomer(userId);

  // Build session params
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `CoolPeople ${TIER_NAMES[tier]}`,
            description: `${billingCycle === 'annual' ? 'Annual' : 'Monthly'} subscription`,
          },
          unit_amount: priceInCents,
          recurring: {
            interval: billingCycle === 'annual' ? 'year' : 'month',
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${env.FRONTEND_URL}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}?checkout=cancelled`,
    metadata: {
      userId,
      tier,
      billingCycle,
    },
  };

  // Apply discount code as Stripe coupon if provided
  if (discountCode) {
    const codeRecord = await prisma.discountCode.findUnique({
      where: { code: discountCode },
    });

    if (codeRecord && codeRecord.isActive) {
      const isExpired = codeRecord.expiresAt && codeRecord.expiresAt < new Date();
      const isMaxed = codeRecord.maxUses > 0 && codeRecord.currentUses >= codeRecord.maxUses;

      if (!isExpired && !isMaxed) {
        // Create a one-time Stripe coupon matching our discount
        const coupon = await stripe.coupons.create({
          percent_off: codeRecord.discountPercent,
          duration: 'once',
          metadata: { discountCodeId: codeRecord.id },
        });
        sessionParams.discounts = [{ coupon: coupon.id }];
        sessionParams.metadata!.discountCodeId = codeRecord.id;
      }
    }
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return {
    checkoutUrl: session.url!,
    sessionId: session.id,
  };
};

// -----------------------------------------------------------------------------
// Create Customer Portal Session
// -----------------------------------------------------------------------------

export const createCustomerPortalSession = async (
  userId: string
): Promise<CustomerPortalResponse> => {
  const customerId = await getOrCreateStripeCustomer(userId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.FRONTEND_URL}`,
  });

  return { portalUrl: session.url };
};

// -----------------------------------------------------------------------------
// Handle Stripe Webhook Events
// -----------------------------------------------------------------------------

export const handleWebhookEvent = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, tier, billingCycle, discountCodeId } = session.metadata || {};

      if (!userId || !tier || !billingCycle) {
        console.warn('Webhook: checkout.session.completed missing metadata', session.id);
        return;
      }

      // Upsert subscription
      await prisma.subscription.upsert({
        where: { userId },
        update: {
          tier,
          billingCycle,
          startDate: new Date(),
          endDate: null,
          externalId: session.subscription as string,
          ...(discountCodeId && { discountCodeId }),
        },
        create: {
          userId,
          tier,
          billingCycle,
          externalId: session.subscription as string,
          ...(discountCodeId && { discountCodeId }),
        },
      });

      // Increment discount code usage if used
      if (discountCodeId) {
        await prisma.discountCode.update({
          where: { id: discountCodeId },
          data: { currentUses: { increment: 1 } },
        });
      }

      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const subRecord = await prisma.subscription.findFirst({
        where: { externalId: subscription.id },
      });

      if (!subRecord) return;

      // If subscription was cancelled, set endDate from cancel_at
      if (subscription.cancel_at_period_end && subscription.cancel_at) {
        await prisma.subscription.update({
          where: { id: subRecord.id },
          data: { endDate: new Date(subscription.cancel_at * 1000) },
        });
      } else if (!subscription.cancel_at_period_end && subRecord.endDate) {
        // Reactivated — clear endDate
        await prisma.subscription.update({
          where: { id: subRecord.id },
          data: { endDate: null },
        });
      }

      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const subRecord = await prisma.subscription.findFirst({
        where: { externalId: subscription.id },
      });

      if (!subRecord) return;

      await prisma.subscription.update({
        where: { id: subRecord.id },
        data: { endDate: new Date() },
      });

      break;
    }
  }
};

// -----------------------------------------------------------------------------
// Subscribe (legacy direct DB write — kept for backwards compatibility)
// -----------------------------------------------------------------------------

export const subscribe = async (
  userId: string,
  data: CreateSubscriptionRequest
): Promise<SubscriptionResponse> => {
  let discountCodeId: string | undefined;

  if (data.discountCode) {
    const code = await prisma.discountCode.findUnique({
      where: { code: data.discountCode },
    });

    if (!code || !code.isActive) {
      throw new ValidationError('Invalid discount code');
    }
    if (code.expiresAt && code.expiresAt < new Date()) {
      throw new ValidationError('Discount code has expired');
    }
    if (code.maxUses > 0 && code.currentUses >= code.maxUses) {
      throw new ValidationError('Discount code has reached its usage limit');
    }

    discountCodeId = code.id;

    await prisma.discountCode.update({
      where: { id: code.id },
      data: { currentUses: { increment: 1 } },
    });
  }

  const sub = await prisma.subscription.upsert({
    where: { userId },
    update: {
      tier: data.tier,
      billingCycle: data.billingCycle,
      startDate: new Date(),
      endDate: null,
      ...(discountCodeId && { discountCodeId }),
    },
    create: {
      userId,
      tier: data.tier,
      billingCycle: data.billingCycle,
      ...(discountCodeId && { discountCodeId }),
    },
  });

  return formatSubscription(sub);
};

// -----------------------------------------------------------------------------
// Cancel Subscription
// -----------------------------------------------------------------------------

export const cancelSubscription = async (
  userId: string
): Promise<SubscriptionResponse> => {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!sub) throw new NotFoundError('Subscription');

  const updated = await prisma.subscription.update({
    where: { userId },
    data: { endDate: new Date() },
  });

  return formatSubscription(updated);
};

// -----------------------------------------------------------------------------
// Validate Discount Code (read-only check)
// -----------------------------------------------------------------------------

export const validateDiscountCode = async (
  code: string
): Promise<DiscountCodeResponse> => {
  const discountCode = await prisma.discountCode.findUnique({
    where: { code },
  });

  if (!discountCode || !discountCode.isActive) {
    return { code, discountPercent: 0, isValid: false, message: 'Invalid discount code' };
  }

  if (discountCode.expiresAt && discountCode.expiresAt < new Date()) {
    return { code, discountPercent: 0, isValid: false, message: 'Discount code has expired' };
  }

  if (discountCode.maxUses > 0 && discountCode.currentUses >= discountCode.maxUses) {
    return { code, discountPercent: 0, isValid: false, message: 'Discount code has reached its usage limit' };
  }

  return {
    code: discountCode.code,
    discountPercent: discountCode.discountPercent,
    isValid: true,
  };
};
