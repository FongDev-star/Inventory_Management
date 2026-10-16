import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {connectDB} from "./config/db.js";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import inventoryRoutes from "./routes/inventory.route.js";
import saleRoutes from "./routes/sale.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import userRoutes from "./routes/user.route.js";
import helmet from "helmet";
import {apiLimiter} from "./middleware/rateLimit.middleware.js";
import {notFound, errorHandler} from "./middleware/error.middleware.js";
import categoryRoutes from "./routes/category.route.js";
import path from "path";
import { fileURLToPath } from "url";


dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
const PORT = process.env.PORT || 5001;

app.use(express.json({ limit: "100kb" }));
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use("/api", apiLimiter);
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({status: "ok"});
});
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);

if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../frontend/dist");

  app.use(express.static(distPath));

  // any non-API page request returns the React app, so refreshing /products works
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

connectDB().then(()=>{
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} on port ${PORT}`);
  })
})