import express from "express"; const router = express.Router();
import { registerUser } from "../controllers/userController";
router.post("/", registerUser);
export default router;