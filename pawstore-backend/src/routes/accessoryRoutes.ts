import express from "express";
const router = express.Router();
import { getAccessories, getAccessoryById, createAccessory, updateAccessory, deleteAccessory } from "../controllers/accessoryController";
router.route("/").get(getAccessories).post(createAccessory);
router.route("/:id").get(getAccessoryById).put(updateAccessory).delete(deleteAccessory);
export default router;