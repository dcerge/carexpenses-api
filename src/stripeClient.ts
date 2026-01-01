import config from './config';
import Stripe from 'stripe';

export const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2025-08-27.basil', // Use latest API version
});
