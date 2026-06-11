import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Newsletter from "../models/newsletterModel";
import { writeLog, logLevels } from "../utils/activityLogger";

const getUserId = (user: any): string => user?._id?.toString() || "anonymous";

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter
// @access  Public
const subscribeNewsletter = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if email already exists
  const existingSubscription = await Newsletter.findOne({ email });

  if (existingSubscription) {
    if (existingSubscription.status === "unsubscribed") {
      // If previously unsubscribed, reactivate
      existingSubscription.status = "active";
      await existingSubscription.save();

      writeLog(logLevels.INFO, "NEWSLETTER_RESUBSCRIBED", "anonymous", {
        subscriptionId: (existingSubscription._id as any).toString(),
        email,
      }, req);

      res.status(200).json({
        message: "You have been resubscribed to our newsletter!",
        subscription: existingSubscription,
      });
    } else {
      // Already subscribed
      writeLog(logLevels.WARN, "NEWSLETTER_ALREADY_SUBSCRIBED", "anonymous", { email }, req);
      res.status(400);
      throw new Error("Email already subscribed to newsletter");
    }
  } else {
    // Create new subscription
    const subscription = new Newsletter({
      email,
    });

    const createdSubscription = await subscription.save();

    writeLog(logLevels.INFO, "NEWSLETTER_SUBSCRIBED", "anonymous", {
      subscriptionId: (createdSubscription._id as any).toString(),
      email,
    }, req);

    res.status(201).json({
      message: "Thank you for subscribing to our newsletter!",
      subscription: createdSubscription,
    });
  }
});

// @desc    Get all newsletter subscriptions
// @route   GET /api/newsletter
// @access  Private/Admin
const getSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Newsletter.find({}).sort({ createdAt: -1 });
  res.json(subscriptions);
});

// @desc    Update subscription status
// @route   PUT /api/newsletter/:id
// @access  Private/Admin
const updateSubscriptionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const subscription = await Newsletter.findById(req.params.id);

  if (subscription) {
    const oldStatus = subscription.status;
    subscription.status = status || subscription.status;

    const updatedSubscription = await subscription.save();

    writeLog(logLevels.INFO, "NEWSLETTER_STATUS_UPDATED", getUserId(req.user), {
      subscriptionId: req.params.id,
      email: subscription.email,
      oldStatus,
      newStatus: updatedSubscription.status,
    }, req);

    res.json(updatedSubscription);
  } else {
    writeLog(logLevels.WARN, "NEWSLETTER_UPDATE_NOT_FOUND", getUserId(req.user), {
      subscriptionId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Subscription not found");
  }
});

// @desc    Delete a subscription
// @route   DELETE /api/newsletter/:id
// @access  Private/Admin
const deleteSubscription = asyncHandler(async (req, res) => {
  const subscription = await Newsletter.findById(req.params.id);

  if (subscription) {
    await Newsletter.deleteOne({ _id: subscription._id });

    writeLog(logLevels.SECURITY, "NEWSLETTER_DELETED", getUserId(req.user), {
      subscriptionId: req.params.id,
      email: subscription.email,
    }, req);

    res.json({ message: "Subscription removed" });
  } else {
    writeLog(logLevels.WARN, "NEWSLETTER_DELETE_NOT_FOUND", getUserId(req.user), {
      subscriptionId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Subscription not found");
  }
});

export {
  subscribeNewsletter,
  getSubscriptions,
  updateSubscriptionStatus,
  deleteSubscription,
};
