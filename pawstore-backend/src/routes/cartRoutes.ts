import express from 'express';
const router = express.Router();


import { getUserCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
 } from "../controllers/cartController";
import { protect  } from "../middleware/authMiddleware";

router.route("/").get(protect, getUserCart).post(protect, addToCart).delete(protect, clearCart);
router.route("/:id").put(protect, updateCartItem).delete(protect, removeFromCart);

export default router;



