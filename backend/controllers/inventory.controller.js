import mongoose from "mongoose";
import Product from "../models/product.model.js";
import InventoryTransaction from "../models/inventoryTransaction.model.js";
import { applyStockChange } from "../utils/inventory.js";

const allowedReasons = {
  stock_in: ["initial", "purchase", "return", "other"],
  stock_out: ["damaged", "expired", "other"],
};

const runInTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    session.endSession();
  }
};

const handleError = (res, error, label) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(label, error.message);
  res.status(500).json({ message: "Internal server error" });
};

const createMovementHandler = (type) => async (req, res) => {
  try {
    const { productId, quantity, note = "" } = req.body;
    const reason = req.body.reason ?? (type === "stock_in" ? "purchase" : undefined);

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res
        .status(400)
        .json({ message: "Quantity must be a whole number greater than 0" });
    }
    if (!allowedReasons[type].includes(reason)) {
      return res.status(400).json({
        message: `Reason must be one of: ${allowedReasons[type].join(", ")}`,
      });
    }

    const change = type === "stock_in" ? quantity : -quantity;

    const result = await runInTransaction((session) =>
      applyStockChange(
        { productId, change, type, reason, note, userId: req.user._id },
        session
      )
    );

    res.status(201).json(result);
  } catch (error) {
    handleError(res, error, `${type} error:`);
  }
};

export const stockIn = createMovementHandler("stock_in");
export const stockOut = createMovementHandler("stock_out");

export const adjustStock = async (req, res) => {
  try {
    const { productId, newStock, note } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    if (!Number.isInteger(newStock) || newStock < 0) {
      return res
        .status(400)
        .json({ message: "New stock must be a whole number, 0 or more" });
    }
    if (!note || !note.trim()) {
      return res.status(400).json({ message: "A note is required for adjustments" });
    }

    const result = await runInTransaction(async (session) => {
      const product = await Product.findOne({
        _id: productId,
        isActive: true,
      }).session(session);

      if (!product) {
        const error = new Error("Product not found");
        error.status = 404;
        throw error;
      }

      const change = newStock - product.stock;
      if (change === 0) {
        const error = new Error("New stock is the same as current stock");
        error.status = 400;
        throw error;
      }

      return applyStockChange(
        {
          productId,
          change,
          type: "adjustment",
          reason: "correction",
          note: note.trim(),
          userId: req.user._id,
        },
        session
      );
    });

    res.status(201).json(result);
  } catch (error) {
    handleError(res, error, "Adjust stock error:");
  }
};

export const getTransactions = async (req, res) => {
  try {
    const { product, type, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (product) {
      if (!mongoose.isValidObjectId(product)) {
        return res.status(400).json({ message: "Invalid product id" });
      }
      filter.product = product;
    }
    if (type) {
      if (!["stock_in", "stock_out", "adjustment"].includes(type)) {
        return res.status(400).json({ message: "Invalid type" });
      }
      filter.type = type;
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate("product", "name sku")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      InventoryTransaction.countDocuments(filter),
    ]);

    res.status(200).json({
      transactions,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      total,
    });
  } catch (error) {
    handleError(res, error, "Get transactions error:");
  }
};

export const getAlerts = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ["$stock", "$lowStockThreshold"] },
    })
      .select("name sku stock lowStockThreshold")
      .sort({ stock: 1 });

    res.status(200).json({
      outOfStock: products.filter((p) => p.stock === 0),
      lowStock: products.filter((p) => p.stock > 0),
    });
  } catch (error) {
    handleError(res, error, "Get alerts error:");
  }
};