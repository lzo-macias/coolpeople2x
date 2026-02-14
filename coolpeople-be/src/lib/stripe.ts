/**
 * Stripe Client
 * Singleton Stripe instance for payment processing
 */

import Stripe from 'stripe';
import { env } from '../config/env.js';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);
