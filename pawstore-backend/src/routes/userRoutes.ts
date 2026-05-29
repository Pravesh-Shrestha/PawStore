import express from "express"; const router = express.Router();
import { registerUser, authUser, logoutUser } from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";
router.post("/", registerUser);
router.post("/login", authUser);
router.post("/logout", logoutUser);
router.get("/profile", protect, (req, res) => {
  const user = req.user as any;
  res.json({ _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin });
});
export default router;