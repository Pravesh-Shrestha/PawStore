import express from "express";
const router = express.Router();
import { getBreeds, getBreedById, createBreed, updateBreed, deleteBreed } from "../controllers/breedController";
router.route("/").get(getBreeds).post(createBreed);
router.route("/:id").get(getBreedById).put(updateBreed).delete(deleteBreed);
export default router;