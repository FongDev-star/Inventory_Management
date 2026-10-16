import Product from "../models/product.model.js";
import InventoryTransaction from "../models/inventoryTransaction.model.js";
import mongoose from "mongoose";

export const applyStockChange = async (
  { productId, change, type, reason, note, userId },
  session
) => {
  const filter = { _id: productId, isActive: true };
  if (change < 0) {
    filter.stock = { $gte: -change };
  }

  const product = await Product.findOneAndUpdate(
    filter,
    { $inc: { stock: change } },
    { returnDocument: "after", session }
  );

  if (!product) {
    const exists = await Product.findOne({ _id: productId, isActive: true }).session(
      session
    );
    const error = new Error(exists ? "Insufficient stock" : "Product not found");
    error.status = exists ? 400 : 404;
    throw error;
  }

  const [transaction] = await InventoryTransaction.create(
    [
      {
        product: product._id,
        type,
        change,
        stockBefore: product.stock - change,
        stockAfter: product.stock,
        reason,
        note,
        createdBy: userId,
      },
    ],
    { session }
  );

  return { product, transaction };
};

export const runInTransaction = async (work) => {
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