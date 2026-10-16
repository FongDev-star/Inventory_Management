import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Get categories error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({ name, description });
    res.status(201).json(category);
  } catch (error) {
    console.error("Create category error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name && name !== category.name) {
      const existing = await Category.findOne({ name });
      if (existing) {
        return res.status(400).json({ message: "Category already exists" });
      }
      category.name = name;
    }
    if (description !== undefined) {
      category.description = description;
    }

    await category.save();
    res.status(200).json(category);
  } catch (error) {
    console.error("Update category error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    const inUse = await Product.exists({ category: category._id });
    if (inUse) {
      return res
        .status(400)
        .json({ message: "Category is used by products and cannot be deleted" });
    }    
    
    await category.deleteOne();
    res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    console.error("Delete category error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};