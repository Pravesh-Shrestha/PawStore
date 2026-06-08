import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Cart from "../models/cartModel";
import Accessory from "../models/accessoryModel";
import { writeLog, logLevels } from "../utils/activityLogger";

// Helper to safely get user ID as string
const getUserId = (user: any): string => user?._id?.toString() || "anonymous";

// Helper to enrich cart items with product details (countInStock)
const enrichCartItems = async (cartItems: any[]) => {
  const enrichedItems = [];
  for (const item of cartItems) {
    const product = await Accessory.findById(item.product).select("countInStock");
    enrichedItems.push({
      ...item.toObject ? item.toObject() : item,
      countInStock: product?.countInStock ?? 0,
    });
  }
  return enrichedItems;
};

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getUserCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: (req.user as any)._id });

  if (cart) {
    const enrichedItems = await enrichCartItems(cart.cartItems);
    res.json(enrichedItems);
  } else {
    res.json([]);
  }
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    writeLog(logLevels.WARN, "CART_ADD_MISSING_FIELDS", getUserId(req.user), {
      body: req.body,
    }, req);
    res.status(400);
    throw new Error("Product ID and quantity are required");
  }

  // Validate product exists
  const product = await Accessory.findById(productId);
  if (!product) {
    writeLog(logLevels.WARN, "CART_ADD_PRODUCT_NOT_FOUND", getUserId(req.user), {
      productId,
    }, req);
    res.status(404);
    throw new Error("Product not found");
  }

  // Check if product is in stock
  if (product.countInStock < quantity) {
    writeLog(logLevels.WARN, "CART_ADD_OUT_OF_STOCK", getUserId(req.user), {
      productId,
      productName: product.name,
      requested: quantity,
      available: product.countInStock,
    }, req);
    res.status(400);
    throw new Error("Product is out of stock");
  }

  // Find user's cart or create a new one
  let cart = await Cart.findOne({ user: (req.user as any)._id });

  if (!cart) {
    cart = new Cart({
      user: (req.user as any)._id,
      cartItems: [],
    });
  }

  // Check if item already exists in cart
  const existItem = cart.cartItems.find(
    (item) => item.product.toString() === productId
  );

  if (existItem) {
    // Update quantity if item exists
    existItem.quantity = quantity;
    writeLog(logLevels.INFO, "CART_ITEM_UPDATED", getUserId(req.user), {
      productId,
      productName: product.name,
      quantity,
    }, req);
  } else {
    // Add new item to cart
    cart.cartItems.push({
      product: productId,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity,
    });
    writeLog(logLevels.INFO, "CART_ITEM_ADDED", getUserId(req.user), {
      productId,
      productName: product.name,
      quantity,
      price: product.price,
    }, req);
  }

  // Save cart
  await cart.save();

  const enrichedItems = await enrichCartItems(cart.cartItems);
  res.status(201).json(enrichedItems);
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:id
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const productId = req.params.id;

  if (!quantity || quantity < 1) {
    res.status(400);
    throw new Error("Quantity must be at least 1");
  }

  // Validate product exists
  const product = await Accessory.findById(productId);
  if (!product) {
    writeLog(logLevels.WARN, "CART_UPDATE_PRODUCT_NOT_FOUND", getUserId(req.user), {
      productId,
    }, req);
    res.status(404);
    throw new Error("Product not found");
  }

  // Check if product is in stock
  if (product.countInStock < quantity) {
    writeLog(logLevels.WARN, "CART_UPDATE_OUT_OF_STOCK", getUserId(req.user), {
      productId,
      productName: product.name,
      requested: quantity,
      available: product.countInStock,
    }, req);
    res.status(400);
    throw new Error("Product is out of stock");
  }

  // Find user's cart
  const cart = await Cart.findOne({ user: (req.user as any)._id });

  if (!cart) {
    writeLog(logLevels.WARN, "CART_UPDATE_CART_NOT_FOUND", getUserId(req.user), {}, req);
    res.status(404);
    throw new Error("Cart not found");
  }

  // Find item in cart
  const cartItem = cart.cartItems.find(
    (item) => item.product.toString() === productId
  );

  if (!cartItem) {
    writeLog(logLevels.WARN, "CART_UPDATE_ITEM_NOT_IN_CART", getUserId(req.user), {
      productId,
    }, req);
    res.status(404);
    throw new Error("Item not found in cart");
  }

  // Update quantity
  const oldQuantity = cartItem.quantity;
  cartItem.quantity = quantity;

  // Save cart
  await cart.save();

  writeLog(logLevels.INFO, "CART_ITEM_QUANTITY_UPDATED", getUserId(req.user), {
    productId,
    productName: product.name,
    oldQuantity,
    newQuantity: quantity,
  }, req);

  const enrichedItems = await enrichCartItems(cart.cartItems);
  res.json(enrichedItems);
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:id
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  // Find user's cart
  const cart = await Cart.findOne({ user: (req.user as any)._id });

  if (!cart) {
    writeLog(logLevels.WARN, "CART_REMOVE_CART_NOT_FOUND", getUserId(req.user), {}, req);
    res.status(404);
    throw new Error("Cart not found");
  }

  // Find the item being removed (for logging)
  const removedItem = cart.cartItems.find(
    (item) => item.product.toString() === productId
  );

  // Remove item from cart
  cart.cartItems = cart.cartItems.filter(
    (item) => item.product.toString() !== productId
  );

  // Save cart
  await cart.save();

  writeLog(logLevels.INFO, "CART_ITEM_REMOVED", getUserId(req.user), {
    productId,
    productName: removedItem?.name || "unknown",
    quantity: removedItem?.quantity || 0,
  }, req);

  const enrichedItems = await enrichCartItems(cart.cartItems);
  res.json(enrichedItems);
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  // Find user's cart
  const cart = await Cart.findOne({ user: (req.user as any)._id });

  if (cart) {
    const itemCount = cart.cartItems.length;

    // Clear cart items
    cart.cartItems = [];

    // Save cart
    await cart.save();

    writeLog(logLevels.INFO, "CART_CLEARED", getUserId(req.user), {
      itemsRemoved: itemCount,
    }, req);
  } else {
    writeLog(logLevels.WARN, "CART_CLEAR_CART_NOT_FOUND", getUserId(req.user), {}, req);
  }

  res.json([]);
});

export {
  getUserCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};

