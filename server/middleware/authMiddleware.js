import User from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";

/**
 * Middleware: Protect routes with JWT verification
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please provide a valid Bearer token."
    });
  }

  try {
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The user belonging to this token no longer exists."
      });
    }

    if (user.accountStatus !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact support."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
};

/**
 * Middleware: Role-based authorization
 * @param  {...string} roles
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of the following roles: [${roles.join(", ")}]. Current role: ${req.user ? req.user.role : "None"}.`
      });
    }
    next();
  };
};

/**
 * Middleware: Ensure NGO is verified before making requests
 */
export const requireVerifiedNgo = (req, res, next) => {
  if (req.user && req.user.role === "NGO") {
    if (req.user.ngoVerificationStatus !== "VERIFIED") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied: Your NGO account is pending verification by an Administrator. Unverified NGOs cannot request surplus food."
      });
    }
  }
  next();
};
