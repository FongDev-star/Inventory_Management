import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

const ROLES = ["admin", "employee"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  isActive: u.isActive,
  createdAt: u.createdAt,
});

export const getUsers = async (req, res) => {
  try {
    const { search, role, isActive, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }
    if (role) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      filter.role = role;
    }
    if (isActive === "true") filter.isActive = true;
    if (isActive === "false") filter.isActive = false;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      users: users.map(publicUser),
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      total,
    });
  } catch (error) {
    console.error("Get users error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role = "employee" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Role must be admin or employee" });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: cleanEmail,
      password: hashedPassword,
      role,
    });

    res.status(201).json(publicUser(user));
  } catch (error) {
    console.error("Create user error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isSelf = String(user._id) === String(req.user._id);

    if (isSelf && role !== undefined && role !== user.role) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }
    if (isSelf && isActive === false) {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      user.name = String(name).trim();
    }

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!EMAIL_REGEX.test(cleanEmail)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      if (cleanEmail !== user.email) {
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
          return res.status(400).json({ message: "Email already in use" });
        }
        user.email = cleanEmail;
      }
    }

    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ message: "Role must be admin or employee" });
      }
      user.role = role;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be true or false" });
      }
      user.isActive = isActive;
    }

    await user.save();
    res.status(200).json(publicUser(user));
  } catch (error) {
    console.error("Update user error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (!newPassword || String(newPassword).length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};