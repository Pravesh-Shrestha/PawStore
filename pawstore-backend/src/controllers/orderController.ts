import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Order from "../models/orderModel";
import Accessory from "../models/accessoryModel";
import { writeLog, logLevels } from "../utils/activityLogger";

const getUserId = (user: any): string => user?._id?.toString() || "anonymous";

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    writeLog(logLevels.WARN, "ORDER_CREATE_NO_ITEMS", getUserId(req.user), {}, req);
    res.status(400);
    throw new Error("No order items");
  } else {
    // Check stock availability and update product quantities
    for (const item of orderItems) {
      const accessory = await Accessory.findById(item.product);

      if (!accessory) {
        writeLog(logLevels.WARN, "ORDER_CREATE_PRODUCT_NOT_FOUND", getUserId(req.user), {
          productId: item.product,
          productName: item.name,
        }, req);
        res.status(404);
        throw new Error(`Product not found: ${item.name}`);
      }

      if (accessory.countInStock < item.quantity) {
        writeLog(logLevels.WARN, "ORDER_CREATE_INSUFFICIENT_STOCK", getUserId(req.user), {
          productId: item.product,
          productName: item.name,
          requested: item.quantity,
          available: accessory.countInStock,
        }, req);
        res.status(400);
        throw new Error(
          `Not enough stock for ${item.name}. Available: ${accessory.countInStock}`
        );
      }

      // Stock will be reduced upon payment confirmation, not at order creation
      // This prevents stock loss from abandoned/unpaid orders
    }

    // Create the order
    const order = new Order({
      orderItems,
      user: (req.user as any)._id,
      shippingAddress,
      paymentMethod,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    const createdOrder = await order.save();

    writeLog(logLevels.INFO, "ORDER_CREATED", getUserId(req.user), {
      orderId: (createdOrder._id as any).toString(),
      totalPrice,
      itemCount: orderItems?.length || 0,
      paymentMethod,
    }, req);

    res.status(201).json(createdOrder);
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (order) {
    // IDOR protection: verify order ownership or admin role
    const userId = (req.user as any)._id.toString();
    const orderUserId = (order.user as any)._id?.toString() || (order.user as any).toString();
    
    if (orderUserId !== userId && !(req.user as any).isAdmin) {
      res.status(403);
      throw new Error("Not authorized to view this order");
    }
    
    res.json(order);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.payer.email_address,
    };

    const updatedOrder = await order.save();

    writeLog(logLevels.INFO, "ORDER_MARKED_PAID", getUserId(req.user), {
      orderId: req.params.id,
      paymentId: req.body.id,
      paymentStatus: req.body.status,
    }, req);

    res.json(updatedOrder);
  } else {
    writeLog(logLevels.WARN, "ORDER_PAY_NOT_FOUND", getUserId(req.user), {
      orderId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Order not found");
  }
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isDelivered = true;
    order.deliveredAt = new Date();
    order.status = "Delivered";

    const updatedOrder = await order.save();

    writeLog(logLevels.INFO, "ORDER_MARKED_DELIVERED", getUserId(req.user), {
      orderId: req.params.id,
      userId: (order.user as any).toString(),
    }, req);

    res.json(updatedOrder);
  } else {
    writeLog(logLevels.WARN, "ORDER_DELIVER_NOT_FOUND", getUserId(req.user), {
      orderId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Order not found");
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    const oldStatus = order.status;
    const newStatus = req.body.status || order.status;

    // If order is being cancelled, restore the stock
    if (newStatus === "Cancelled" && oldStatus !== "Cancelled") {
      for (const item of order.orderItems) {
        const accessory = await Accessory.findById(item.product);
        if (accessory) {
          accessory.countInStock += item.quantity;
          await accessory.save();
        }
      }
      writeLog(logLevels.INFO, "ORDER_CANCELLED_STOCK_RESTORED", getUserId(req.user), {
        orderId: req.params.id,
      }, req);
    }

    order.status = newStatus;
    const updatedOrder = await order.save();

    writeLog(logLevels.INFO, "ORDER_STATUS_UPDATED", getUserId(req.user), {
      orderId: req.params.id,
      oldStatus,
      newStatus,
    }, req);

    res.json(updatedOrder);
  } else {
    writeLog(logLevels.WARN, "ORDER_STATUS_UPDATE_NOT_FOUND", getUserId(req.user), {
      orderId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Order not found");
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: (req.user as any)._id });
  res.json(orders);
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate("user", "id name");
  res.json(orders);
});

export {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  updateOrderStatus,
  getMyOrders,
  getOrders,
};

