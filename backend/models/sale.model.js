import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },
    customerName: { type: String, trim: true, default: "Walk-in customer" },
    items: { type: [saleItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "paid",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank", "other"],
      default: "cash",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;