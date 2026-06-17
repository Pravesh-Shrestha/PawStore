import express from 'express';
const router = express.Router();


import { getAccessories,
  getAccessoryById,
  createAccessory,
  updateAccessory,
  deleteAccessory,
 } from "../controllers/accessoryController";
import { protect, admin  } from "../middleware/authMiddleware";

router.route("/").get(getAccessories).post(protect, admin, createAccessory);
router
  .route("/:id")
  .get(getAccessoryById)
  .put(protect, admin, updateAccessory)
  .delete(protect, admin, deleteAccessory);

export default router;



