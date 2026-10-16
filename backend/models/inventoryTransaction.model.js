import mongoose from "mongoose";

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["stock_in", "stock_out", "adjustment"],
      required: true,
    },
    change: { type: Number, required: true },
    stockBefore: { type: Number, required: true },
    stockAfter: { type: Number, required: true },
    reason: {
      type: String,
      enum: [
        "initial",
        "purchase",
        "return",
        "sale",
        "damaged",
        "expired",
        "correction",
        "other",
      ],
      required: true,
    },
    note: { type: String, trim: true, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);

export default InventoryTransaction;