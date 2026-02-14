/**
 * Subscriptions Module Validation Schemas
 */

import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  body: z.object({
    tier: z.enum(['premium', 'privacy', 'adfree']),
    billingCycle: z.enum(['monthly', 'annual']),
    discountCode: z.string().trim().optional(),
  }),
});

export const createCheckoutSchema = z.object({
  body: z.object({
    tier: z.enum(['premium', 'privacy', 'adfree']),
    billingCycle: z.enum(['monthly', 'annual']),
    discountCode: z.string().trim().optional(),
  }),
});

export const validateDiscountCodeSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1, 'Discount code is required'),
  }),
});
