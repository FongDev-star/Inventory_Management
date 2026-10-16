import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import {generateToken} from "../utils/token.js";


export const register = async (req, res) => {
  try{
    const {name, email, password} = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({message: "All fields are required"});
    }

    if (password.length < 6) {
      return res.status(400).json({message: "Password must be at least 6 characters"});
    }

    const existing = await User.findOne({email});

    if (existing) {
      return res.status(400).json({message: "Email already in use"});
    }

    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res
        .status(403)
        .json({ message: "Registration is closed. Ask an admin to create your account" });
    }
    const role = "admin";

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
  });

    const token = generateToken(user._id, res);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      } 
    });
  }catch(error){
    console.error("Registration Error:", error.message);
    res.status(500).json({message: "Internal Server error"});
  } 
}

export const login = async (req, res) => {
  try{
    const {email, password} = req.body;

    if (!email || !password) {
      return res.status(400).json({message: "Email and password are required"});
    }

    const user = await User.findOne({email}).select("+password");

    if (!user || !user.isActive) {
      return res.status(400).json({message: "Invalid credentials"});
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({message: "Invalid credentials"});
    }

    generateToken(user._id, res);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  }catch(error){
    console.error("Login Error:", error.message);
    res.status(500).json({message: "Internal Server error"});
  }
}

export const logout = (req, res) => {
  res.cookie("jwt", "", {maxAge: 0});
  res.status(200).json({message: "Logged out successfully"});
} 

export const getMe = (req, res) => {
  res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
};



