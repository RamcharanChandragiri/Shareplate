/**
 * Catch-all handler for undefined routes (404)
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
};

/**
 * Global centralized error-handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  console.error(`Error occurred: ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};
