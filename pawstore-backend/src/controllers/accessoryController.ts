import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Accessory from "../models/accessoryModel";
import { writeLog, logLevels } from "../utils/activityLogger";

const getUserId = (user: any): string => user?._id?.toString() || "anonymous";

// @desc    Fetch all accessories
// @route   GET /api/accessories
// @access  Public
const getAccessories = asyncHandler(async (req, res) => {
  const category = req.query.category;
  const query = category && category !== 'all' ? { category } : {};
  
  const accessories = await Accessory.find(query);
  res.json(accessories);
});

// @desc    Fetch single accessory
// @route   GET /api/accessories/:id
// @access  Public
const getAccessoryById = asyncHandler(async (req, res) => {
  const accessory = await Accessory.findById(req.params.id);

  if (accessory) {
    res.json(accessory);
  } else {
    res.status(404);
    throw new Error("Accessory not found");
  }
});

// @desc    Create an accessory
// @route   POST /api/accessories
// @access  Private/Admin
const createAccessory = asyncHandler(async (req, res) => {
  const { name, price, rating, image, category, bestseller, countInStock } = req.body;

  const accessory = new Accessory({
    name,
    price,
    rating,
    image,
    category,
    bestseller: bestseller || false,
    countInStock: countInStock || 0,
  });

  const createdAccessory = await accessory.save();

  writeLog(logLevels.INFO, "ACCESSORY_CREATED", getUserId(req.user), {
    accessoryId: (createdAccessory._id as any).toString(),
    accessoryName: name,
    category,
    price,
  }, req);

  res.status(201).json(createdAccessory);
});

// @desc    Update an accessory
// @route   PUT /api/accessories/:id
// @access  Private/Admin
const updateAccessory = asyncHandler(async (req, res) => {
  const { name, price, rating, image, category, bestseller, countInStock } = req.body;

  const accessory = await Accessory.findById(req.params.id);

  if (accessory) {
    accessory.name = name || accessory.name;
    accessory.price = price !== undefined ? price : accessory.price;
    accessory.rating = rating !== undefined ? rating : accessory.rating;
    accessory.image = image || accessory.image;
    accessory.category = category || accessory.category;
    accessory.bestseller = bestseller !== undefined ? bestseller : accessory.bestseller;
    accessory.countInStock = countInStock !== undefined ? countInStock : accessory.countInStock;

    const updatedAccessory = await accessory.save();

    writeLog(logLevels.INFO, "ACCESSORY_UPDATED", getUserId(req.user), {
      accessoryId: req.params.id,
      accessoryName: updatedAccessory.name,
      updatedFields: Object.keys(req.body),
    }, req);

    res.json(updatedAccessory);
  } else {
    writeLog(logLevels.WARN, "ACCESSORY_UPDATE_NOT_FOUND", getUserId(req.user), {
      accessoryId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Accessory not found");
  }
});

// @desc    Delete an accessory
// @route   DELETE /api/accessories/:id
// @access  Private/Admin
const deleteAccessory = asyncHandler(async (req, res) => {
  const accessory = await Accessory.findById(req.params.id);

  if (accessory) {
    await Accessory.deleteOne({ _id: accessory._id });

    writeLog(logLevels.SECURITY, "ACCESSORY_DELETED", getUserId(req.user), {
      accessoryId: req.params.id,
      accessoryName: accessory.name,
    }, req);

    res.json({ message: "Accessory removed" });
  } else {
    writeLog(logLevels.WARN, "ACCESSORY_DELETE_NOT_FOUND", getUserId(req.user), {
      accessoryId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Accessory not found");
  }
});

export {
  getAccessories,
  getAccessoryById,
  createAccessory,
  updateAccessory,
  deleteAccessory,
};
