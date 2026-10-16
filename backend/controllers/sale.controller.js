import mongoose from "mongoose";
import Sale from "../models/sale.model.js";
import Product from "../models/product.model.js";
import { applyStockChange, runInTransaction } from "../utils/inventory.js";

const PAYMENT_STATUSES = ["paid", "unpaid"];
const PAYMENT_METHODS = ["cash", "card", "bank", "other"];

const round2 = (n) => Math.round(n * 100) / 100;

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const handleError = (res, error, label) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(label, error.message);
  res.status(500).json({ message: "Internal server error" });
};

const generateReceiptNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RCT-${date}-${random}`;
};

const hiddenFor = (user) => (user.role === "admin" ? "" : "-totalCost -items.cost");

export const createSale = async (req, res) => {
  try {
    const {
      items,
      customerName,
      paymentStatus = "paid",
      paymentMethod = "cash",
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }
    if (items.length > 100) {
      return res.status(400).json({ message: "Too many items in one sale" });
    }
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return res
        .status(400)
        .json({ message: `Payment status must be one of: ${PAYMENT_STATUSES.join(", ")}` });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res
        .status(400)
        .json({ message: `Payment method must be one of: ${PAYMENT_METHODS.join(", ")}` });
    }

    // merge duplicate lines of the same product
    const merged = new Map();
    for (const line of items) {
      const { productId, quantity } = line || {};
      if (!mongoose.isValidObjectId(productId)) {
        return res.status(400).json({ message: "Invalid product id" });
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res
          .status(400)
          .json({ message: "Quantity must be a whole number greater than 0" });
      }
      merged.set(productId, (merged.get(productId) || 0) + quantity);
    }

    const receiptNumber = generateReceiptNumber();

    const sale = await runInTransaction(async (session) => {
      const saleItems = [];

      for (const [productId, quantity] of merged) {
        let result;
        try {
          result = await applyStockChange(
            {
              productId,
              change: -quantity,
              type: "stock_out",
              reason: "sale",
              note: `Sale ${receiptNumber}`,
              userId: req.user._id,
            },
            session
          );
        } catch (error) {
          if (error.status === 400) {
            const p = await Product.findById(productId).select("name").session(session);
            throw httpError(400, `Insufficient stock for ${p ? p.name : "a product"}`);
          }
          throw error;
        }

        const p = result.product;
        saleItems.push({
          product: p._id,
          name: p.name,
          sku: p.sku,
          quantity,
          price: p.price,
          cost: p.cost,
          subtotal: round2(p.price * quantity),
        });
      }

      const total = round2(saleItems.reduce((sum, i) => sum + i.subtotal, 0));
      const totalCost = round2(saleItems.reduce((sum, i) => sum + i.cost * i.quantity, 0));

      const [created] = await Sale.create(
        [
          {
            receiptNumber,
            customerName: customerName && customerName.trim() ? customerName.trim() : undefined,
            items: saleItems,
            total,
            totalCost,
            paymentStatus,
            paymentMethod,
            createdBy: req.user._id,
          },
        ],
        { session }
      );

      return created;
    });

    const saved = await Sale.findById(sale._id)
      .populate("createdBy", "name")
      .select(hiddenFor(req.user));

    res.status(201).json(saved);
  } catch (error) {
    handleError(res, error, "Create sale error:");
  }
};

export const getSales = async (req, res) => {
  try {
    const { paymentStatus, from, to, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    if (paymentStatus) {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }
      filter.paymentStatus = paymentStatus;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate)) {
          return res.status(400).json({ message: "Invalid from date" });
        }
        filter.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate)) {
          return res.status(400).json({ message: "Invalid to date" });
        }
        filter.createdAt.$lte = toDate;
      }
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate("createdBy", "name")
        .select(hiddenFor(req.user))
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Sale.countDocuments(filter),
    ]);

    res.status(200).json({
      sales,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      total,
    });
  } catch (error) {
    handleError(res, error, "Get sales error:");
  }
};

export const getSaleById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid sale id" });
    }

    const filter = { _id: req.params.id };
    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    const sale = await Sale.findOne(filter)
      .populate("createdBy", "name")
      .select(hiddenFor(req.user));

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    res.status(200).json(sale);
  } catch (error) {
    handleError(res, error, "Get sale error:");
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid sale id" });
    }
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return res
        .status(400)
        .json({ message: `Payment status must be one of: ${PAYMENT_STATUSES.join(", ")}` });
    }

    const sale = await Sale.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { returnDocument: "after" }
    ).populate("createdBy", "name");

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    res.status(200).json(sale);
  } catch (error) {
    handleError(res, error, "Update payment error:");
  }
};