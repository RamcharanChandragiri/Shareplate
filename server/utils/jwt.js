import jwt from "jsonwebtoken";

/**
 * Generate a JSON Web Token
 * @param {string} userId
 * @param {string} role
 * @returns {string} Signed JWT
 */
export const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured in environment variables.");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign({ id: userId, role }, secret, {
    expiresIn
  });
};

/**
 * Verify a JSON Web Token
 * @param {string} token
 * @returns {object} Decoded token payload
 */
export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured in environment variables.");
  }
  return jwt.verify(token, secret);
};
