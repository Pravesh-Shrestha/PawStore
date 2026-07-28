import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Stripe from "stripe";
import Order from "../models/orderModel";
import Accessory from "../models/accessoryModel";
import { writeLog, logLevels } from "../utils/activityLogger";

// Initialize Stripe with secret key from env
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-05-27.dahlia" as any,
});

// @desc    Create and confirm Stripe PaymentIntent, then mark order as paid
// @route   POST /api/payments/create-payment-intent
// @access  Private
const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.body;

  if (!orderId || typeof orderId !== "string" || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
    res.status(400);
    throw new Error("Valid string Order ID is required");
  }

  const order = await Order.findById(String(orderId));

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Verify the order belongs to the authenticated user
  if ((order.user as any).toString() !== (req.user as any)._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to pay for this order");
  }

  if (order.isPaid) {
    res.status(400);
    throw new Error("Order has already been paid");
  }

  const amount = Math.round(order.totalPrice * 100);

  try {
    // Create a PaymentIntent with automatic payment methods
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: {
        orderId: (order._id as any).toString(),
        userId: (req.user as any)._id.toString(),
      },
      description: `PawStore Order #${(order._id as any).toString().slice(-8)}`,
      automatic_payment_methods: { enabled: true },
    });

    writeLog(logLevels.INFO, "PAYMENT_INTENT_CREATED", (req.user as any)._id.toString(), {
      orderId: (order._id as any).toString(),
      amount,
    }, req);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
    });
  } catch (error: any) {
    writeLog(logLevels.ERROR, "PAYMENT_INTENT_FAILED", (req.user as any)._id.toString(), {
      error: error.message,
    }, req);
    res.status(500);
    throw new Error(`Payment processing error: ${error.message}`);
  }
});

// @desc    Confirm payment after Stripe confirms the charge
// @route   POST /api/payments/confirm
// @access  Private
const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentIntentId, orderId } = req.body;

  if (
    !paymentIntentId ||
    typeof paymentIntentId !== "string" ||
    !orderId ||
    typeof orderId !== "string" ||
    !/^[0-9a-fA-F]{24}$/.test(orderId)
  ) {
    res.status(400);
    throw new Error("Valid PaymentIntent ID and 24-character Order ID are required");
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId) as any;

    if (paymentIntent.status !== "succeeded") {
      res.status(400);
      throw new Error(`Payment has not succeeded. Status: ${paymentIntent.status}`);
    }

    const order = await Order.findById(String(orderId));

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    // Reduce stock on successful payment (prevents stock loss from abandoned orders)
    for (const item of order.orderItems) {
      const accessory = await Accessory.findById(item.product);
      if (accessory) {
        if (accessory.countInStock < item.quantity) {
          writeLog(logLevels.ERROR, "STOCK_INSUFFICIENT_ON_PAYMENT", (req.user as any)._id.toString(), {
            productId: item.product.toString(),
            productName: item.name,
            available: accessory.countInStock,
            requested: item.quantity,
          }, req);
          // Continue anyway — order is already paid, log the discrepancy
        } else {
          accessory.countInStock -= item.quantity;
          await accessory.save();
        }
      }
    }

    // Update order as paid
    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentResult = {
      id: paymentIntent.id,
      status: paymentIntent.status,
      update_time: new Date(paymentIntent.created * 1000).toISOString(),
      email_address: paymentIntent.receipt_email || "",
    };
    order.paymentMethod = "Stripe";

    const updatedOrder = await order.save();

    writeLog(logLevels.INFO, "PAYMENT_CONFIRMED", (req.user as any)._id.toString(), {
      orderId: (order._id as any).toString(),
      paymentIntentId: paymentIntent.id,
    }, req);

    res.json(updatedOrder);
  } catch (error: any) {
    writeLog(logLevels.ERROR, "PAYMENT_CONFIRM_FAILED", (req.user as any)._id.toString(), {
      error: error.message,
    }, req);
    res.status(500);
    throw new Error(`Payment confirmation error: ${error.message}`);
  }
});

// @desc    Stripe webhook handler (for server-to-server events)
// @route   POST /api/payments/webhook
// @access  Public (verified by Stripe signature)
const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  let event: any;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    writeLog(logLevels.WARN, "WEBHOOK_SIGNATURE_INVALID", "system", {
      error: err.message,
    }, req);
    res.status(400).json({ message: `Webhook signature verification failed` });
    return;
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as any;
      const orderId = paymentIntent.metadata.orderId;

      if (orderId) {
        const order = await Order.findById(orderId);
        if (order && !order.isPaid) {
          // Reduce stock on successful payment (webhook path)
          for (const item of order.orderItems) {
            const accessory = await Accessory.findById(item.product);
            if (accessory) {
              if (accessory.countInStock >= item.quantity) {
                accessory.countInStock -= item.quantity;
                await accessory.save();
              } else {
                writeLog(logLevels.ERROR, "WEBHOOK_STOCK_INSUFFICIENT", "system", {
                  orderId,
                  productId: item.product.toString(),
                  available: accessory.countInStock,
                  requested: item.quantity,
                }, req);
              }
            }
          }

          order.isPaid = true;
          order.paidAt = new Date();
          order.paymentResult = {
            id: paymentIntent.id,
            status: paymentIntent.status,
            update_time: new Date(paymentIntent.created * 1000).toISOString(),
            email_address: paymentIntent.receipt_email || "",
          };
          order.paymentMethod = "Stripe";
          await order.save();

          writeLog(logLevels.INFO, "WEBHOOK_PAYMENT_SUCCEEDED", "system", {
            orderId,
            paymentIntentId: paymentIntent.id,
          }, req);
        }
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const failedIntent = event.data.object as any;
      writeLog(logLevels.WARN, "WEBHOOK_PAYMENT_FAILED", "system", {
        paymentIntentId: failedIntent.id,
        error: failedIntent.last_payment_error?.message,
      }, req);
      break;
    }
    default:
      writeLog(logLevels.INFO, "WEBHOOK_UNHANDLED_EVENT", "system", {
        type: event.type,
      }, req);
  }

  res.json({ received: true });
});

// @desc    Get Stripe publishable key for frontend
// @route   GET /api/payments/config
// @access  Public
const getStripeConfig = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  });
});

export {
  createPaymentIntent,
  confirmPayment,
  stripeWebhook,
  getStripeConfig,
};
