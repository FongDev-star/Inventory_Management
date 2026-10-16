import mongoose from "mongoose";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidNumber = (value) =>
  value !== undefined && value !== "" && !isNaN(Number(value)) && Number(value) >= 0;

export const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      lowStock,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = { isActive: true };

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: regex }, { sku: regex }];
    }

    if (category) {
      if (!mongoose.isValidObjectId(category)) {
        return res.status(400).json({ message: "Invalid category id" });
      }
      filter.category = category;
    }

    if (lowStock === "true") {
      filter.$expr = { $lte: ["$stock", "$lowStockThreshold"] };
    }

    const allowedSort = ["name", "price", "stock", "createdAt"];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const query = Product.find(filter)
      .populate("category", "name")
      .sort({ [sortField]: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    if (req.user.role !== "admin") {
      query.select("-cost");
    }

    const [products, total] = await Promise.all([
      query,
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      products,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      total,
    });
  } catch (error) {
    console.error("Get products error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getProductById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const query = Product.findOne({ _id: req.params.id, isActive: true }).populate(
      "category",
      "name"
    );

    if (req.user.role !== "admin") {
      query.select("-cost");
    }

    const product = await query;
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Get product error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, sku, category, price, cost, lowStockThreshold } = req.body;

    if (!name || !sku || !category || price === undefined) {
      return res
        .status(400)
        .json({ message: "Name, SKU, category and price are required" });
    }
    if (!isValidNumber(price)) {
      return res.status(400).json({ message: "Price must be 0 or more" });
    }
    if (cost !== undefined && !isValidNumber(cost)) {
      return res.status(400).json({ message: "Cost must be 0 or more" });
    }
    if (!mongoose.isValidObjectId(category)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Category does not exist" });
    }

    const existing = await Product.findOne({ sku: sku.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: "SKU already in use" });
    }

    const product = await Product.create({
      name,
      sku,
      category,
      price,
      cost,
      lowStockThreshold,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("Create product error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findOne({ _id: req.params.id, isActive: true });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { name, sku, category, price, cost, lowStockThreshold } = req.body;

    if (sku && sku.trim().toUpperCase() !== product.sku) {
      const existing = await Product.findOne({ sku: sku.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({ message: "SKU already in use" });
      }
      product.sku = sku;
    }

    if (category) {
      if (!mongoose.isValidObjectId(category)) {
        return res.status(400).json({ message: "Invalid category id" });
      }
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: "Category does not exist" });
      }
      product.category = category;
    }

    if (price !== undefined) {
      if (!isValidNumber(price)) {
        return res.status(400).json({ message: "Price must be 0 or more" });
      }
      product.price = price;
    }
    if (cost !== undefined) {
      if (!isValidNumber(cost)) {
        return res.status(400).json({ message: "Cost must be 0 or more" });
      }
      product.cost = cost;
    }
    if (lowStockThreshold !== undefined) {
      if (!isValidNumber(lowStockThreshold)) {
        return res
          .status(400)
          .json({ message: "Low stock threshold must be 0 or more" });
      }
      product.lowStockThreshold = lowStockThreshold;
    }
    if (name) {
      product.name = name;
    }

    await product.save();
    res.status(200).json(product);
  } catch (error) {
    console.error("Update product error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findOne({ _id: req.params.id, isActive: true });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.isActive = false;
    await product.save();

    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    console.error("Delete product error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};