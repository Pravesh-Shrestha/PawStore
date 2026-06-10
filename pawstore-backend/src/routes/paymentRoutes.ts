import express from 'express';
const router = express.Router();

import {
  createPaymentIntent,
  confirmPayment,
  stripeWebhook,
  getStripeConfig,
} from "../controllers/paymentController";
import { protect } from "../middleware/authMiddleware";

// Stripe webhook needs raw body (not JSON parsed), so it comes before express.json()
// The webhook route is handled in index.ts before JSON middleware
// Public routes
router.get("/config", getStripeConfig);

// Protected routes
router.post("/create-payment-intent", protect, createPaymentIntent);
router.post("/confirm", protect, confirmPayment);

export default router;
