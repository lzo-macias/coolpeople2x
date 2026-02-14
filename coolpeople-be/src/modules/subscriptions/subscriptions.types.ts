/**
 * Subscriptions Module Types
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type SubscriptionTier = 'premium' | 'privacy' | 'adfree';
export type BillingCycle = 'monthly' | 'annual';

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateSubscriptionRequest {
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  discountCode?: string;
}

export interface ValidateDiscountCodeRequest {
  code: string;
}

// -----------------------------------------------------------------------------
// Response Types
// -----------------------------------------------------------------------------

export interface SubscriptionResponse {
  id: string;
  tier: string;
  billingCycle: string;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
}

export interface DiscountCodeResponse {
  code: string;
  discountPercent: number;
  isValid: boolean;
  message?: string;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface CustomerPortalResponse {
  portalUrl: string;
}
