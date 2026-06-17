import express from 'express';
const router = express.Router();


import { getBreeds,
  getBreedById,
  createBreed,
  updateBreed,
  deleteBreed,
 } from "../controllers/breedController";
import { protect, admin  } from "../middleware/authMiddleware";

router.route("/").get(getBreeds).post(protect, admin, createBreed);
router
  .route("/:id")
  .get(getBreedById)
  .put(protect, admin, updateBreed)
  .delete(protect, admin, deleteBreed);

export default router;



