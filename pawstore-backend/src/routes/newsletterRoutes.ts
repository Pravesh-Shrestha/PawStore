import express from 'express';
const router = express.Router();


import { subscribeNewsletter,
  getSubscriptions,
  updateSubscriptionStatus,
  deleteSubscription,
 } from "../controllers/newsletterController";
import { protect, admin  } from "../middleware/authMiddleware";

router.route("/").post(subscribeNewsletter).get(protect, admin, getSubscriptions);
router
  .route("/:id")
  .put(protect, admin, updateSubscriptionStatus)
  .delete(protect, admin, deleteSubscription);

export default router;



