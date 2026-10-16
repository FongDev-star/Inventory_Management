import jwt from "jsonwebtoken";
import User from "../models/user.model.js";


export const protect = async (req, res, next) => {
  try{
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({message: "Unauthorized"});
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({message: "Unauthorized, user not found!"});
    }

    req.user = user;
    next();
  }catch(error){
    console.error("Auth Middleware Error:", error.message);
    res.status(401).json({message: "Unauthorized, invalid token"});
  }
}

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({message: "Access denied, admin only!"});
}
