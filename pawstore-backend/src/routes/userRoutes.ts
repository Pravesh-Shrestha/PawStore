import express from "express"; const router = express.Router();
import { registerUser, authUser, logoutUser, getUserProfile, updateUserProfile } from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";
router.post("/", registerUser);
router.post("/login", authUser);
router.post("/logout", logoutUser);
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);
export default router;