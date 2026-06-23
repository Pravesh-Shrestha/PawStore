import express from "express"; const router = express.Router();
import { registerUser, authUser, logoutUser, getUserProfile, updateUserProfile, getUsers, deleteUser, unlockUser } from "../controllers/userController";
import { protect, admin } from "../middleware/authMiddleware";
import { verifyCaptcha } from "../middleware/captchaMiddleware";
import { authLimiter } from "../middleware/rateLimiter";

router.post("/", authLimiter, verifyCaptcha, registerUser);
router.post("/login", authLimiter, verifyCaptcha, authUser);
router.post("/logout", logoutUser);
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);
router.route("/").get(protect, admin, getUsers);
router.route("/:id").delete(protect, admin, deleteUser);
router.route("/:id/unlock").put(protect, admin, unlockUser);
export default router;