import mongoose from "mongoose";

/**
 * Root Welcome Handler
 * GET /
 */
export const getRoot = (req, res) => {
  res.status(200).send("Welcome to SharePlate Backend!");
};

/**
 * Health Check Handler
 * GET /api/health
 * Reports application status and database connectivity.
 */
export const getHealth = (req, res) => {
  const dbConnectionStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  const stateCode = mongoose.connection.readyState;
  const dbStatus = dbConnectionStates[stateCode] || "unknown";

  res.status(200).json({
    success: true,
    message: "SharePlate server is running!",
    database: {
      status: dbStatus,
      connected: stateCode === 1
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
};
