/**
 * Subscriptions Routes
 * /api/subscriptions/*
 */

import { Router } from 'express';
import * as subscriptionsController from './subscriptions.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  createSubscriptionSchema,
  createCheckoutSchema,
  validateDiscountCodeSchema,
} from './subscriptions.schemas.js';

const router = Router();

// All routes require authentication
router.get('/me', requireAuth, subscriptionsController.getMySubscription);
router.post('/', requireAuth, validate(createSubscriptionSchema), subscriptionsController.subscribe);
router.post('/checkout', requireAuth, validate(createCheckoutSchema), subscriptionsController.createCheckout);
router.post('/portal', requireAuth, subscriptionsController.createPortal);
router.post('/cancel', requireAuth, subscriptionsController.cancelSubscription);
router.post('/validate-code', requireAuth, validate(validateDiscountCodeSchema), subscriptionsController.validateCode);

export default router;
