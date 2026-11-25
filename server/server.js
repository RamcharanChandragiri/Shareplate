import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { getRoot } from "./controllers/healthController.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Load environment variables relative to server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

// Global Middleware & CORS Configuration
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.get("/", getRoot);
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Server Startup
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database before starting HTTP listener
    await connectDB();

    app.listen(PORT, () => {
      console.log(`SharePlate server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

export default app;
