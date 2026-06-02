import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Breed from "../models/breedModel";
import { writeLog, logLevels } from "../utils/activityLogger";

const getUserId = (user: any): string => user?._id?.toString() || "anonymous";

// @desc    Fetch all breeds
// @route   GET /api/breeds
// @access  Public
const getBreeds = asyncHandler(async (req, res) => {
  const breeds = await Breed.find({});
  res.json(breeds);
});

// @desc    Fetch single breed
// @route   GET /api/breeds/:id
// @access  Public
const getBreedById = asyncHandler(async (req, res) => {
  const breed = await Breed.findById(req.params.id);

  if (breed) {
    res.json(breed);
  } else {
    res.status(404);
    throw new Error("Breed not found");
  }
});

// @desc    Create a breed
// @route   POST /api/breeds
// @access  Private/Admin
const createBreed = asyncHandler(async (req, res) => {
  const { name, image, description, traits, featured } = req.body;

  const breed = new Breed({
    name,
    image,
    description,
    traits,
    featured: featured || false,
  });

  const createdBreed = await breed.save();

  writeLog(logLevels.INFO, "BREED_CREATED", getUserId(req.user), {
    breedId: (createdBreed._id as any).toString(),
    breedName: name,
  }, req);

  res.status(201).json(createdBreed);
});

// @desc    Update a breed
// @route   PUT /api/breeds/:id
// @access  Private/Admin
const updateBreed = asyncHandler(async (req, res) => {
  const { name, image, description, traits, featured } = req.body;

  const breed = await Breed.findById(req.params.id);

  if (breed) {
    breed.name = name || breed.name;
    breed.image = image || breed.image;
    breed.description = description || breed.description;
    breed.traits = traits || breed.traits;
    breed.featured = featured !== undefined ? featured : breed.featured;

    const updatedBreed = await breed.save();

    writeLog(logLevels.INFO, "BREED_UPDATED", getUserId(req.user), {
      breedId: req.params.id,
      breedName: updatedBreed.name,
      updatedFields: Object.keys(req.body),
    }, req);

    res.json(updatedBreed);
  } else {
    writeLog(logLevels.WARN, "BREED_UPDATE_NOT_FOUND", getUserId(req.user), {
      breedId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Breed not found");
  }
});

// @desc    Delete a breed
// @route   DELETE /api/breeds/:id
// @access  Private/Admin
const deleteBreed = asyncHandler(async (req, res) => {
  const breed = await Breed.findById(req.params.id);

  if (breed) {
    await Breed.deleteOne({ _id: breed._id });

    writeLog(logLevels.SECURITY, "BREED_DELETED", getUserId(req.user), {
      breedId: req.params.id,
      breedName: breed.name,
    }, req);

    res.json({ message: "Breed removed" });
  } else {
    writeLog(logLevels.WARN, "BREED_DELETE_NOT_FOUND", getUserId(req.user), {
      breedId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Breed not found");
  }
});

export {
  getBreeds,
  getBreedById,
  createBreed,
  updateBreed,
  deleteBreed,
};
