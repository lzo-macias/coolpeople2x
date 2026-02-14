/**
 * Subscriptions Controller
 * HTTP request handlers for subscription management
 */

import type { Request, Response } from 'express';
import * as subscriptionsService from './subscriptions.service.js';
import { stripe } from '../../lib/stripe.js';
import { env } from '../../config/env.js';
import { sendSuccess, sendCreated } from '../../lib/response.js';

// GET /api/subscriptions/me
export const getMySubscription = async (req: Request, res: Response): Promise<void> => {
  const subscription = await subscriptionsService.getSubscription(req.user!.userId);
  sendSuccess(res, { subscription });
};

// POST /api/subscriptions
export const subscribe = async (req: Request, res: Response): Promise<void> => {
  const subscription = await subscriptionsService.subscribe(req.user!.userId, req.body);
  sendCreated(res, { subscription });
};

// POST /api/subscriptions/cancel
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  const subscription = await subscriptionsService.cancelSubscription(req.user!.userId);
  sendSuccess(res, { subscription });
};

// POST /api/subscriptions/validate-code
export const validateCode = async (req: Request, res: Response): Promise<void> => {
  const result = await subscriptionsService.validateDiscountCode(req.body.code);
  sendSuccess(res, result);
};

// POST /api/subscriptions/checkout
export const createCheckout = async (req: Request, res: Response): Promise<void> => {
  const result = await subscriptionsService.createCheckoutSession(req.user!.userId, req.body);
  sendSuccess(res, result);
};

// POST /api/subscriptions/portal
export const createPortal = async (req: Request, res: Response): Promise<void> => {
  const result = await subscriptionsService.createCustomerPortalSession(req.user!.userId);
  sendSuccess(res, result);
};

// POST /api/subscriptions/webhook (standalone — uses raw body)
export const stripeWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['stripe-signature'] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    await subscriptionsService.handleWebhookEvent(event);
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
};
