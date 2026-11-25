import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";

/**
 * POST /api/auth/register
 * Public registration for DONOR and NGO roles only.
 */
export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      phone,
      role,
      donorDetails,
      ngoDetails
    } = req.body;

    // 1. Basic validation
    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: name, email, password, phone, role."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long."
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match."
      });
    }

    const normalizedRole = role.toUpperCase();

    // 2. Security restriction: Never allow public registration for ADMIN
    if (normalizedRole === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Registration for ADMIN accounts is prohibited through public registration."
      });
    }

    if (!["DONOR", "NGO"].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified. Public registration permits only DONOR or NGO."
      });
    }

    // 3. Duplicate email check
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists."
      });
    }

    // 4. Role-specific validation
    let sanitizedDonorDetails = {};
    let sanitizedNgoDetails = {};

    if (normalizedRole === "DONOR") {
      if (!donorDetails || !donorDetails.organizationName || !donorDetails.address) {
        return res.status(400).json({
          success: false,
          message: "Donor registration requires organization/business name and address."
        });
      }
      sanitizedDonorDetails = {
        organizationName: donorDetails.organizationName.trim(),
        organizationType: donorDetails.organizationType || "OTHER",
        address: donorDetails.address.trim()
      };
    } else if (normalizedRole === "NGO") {
      if (
        !ngoDetails ||
        !ngoDetails.ngoName ||
        !ngoDetails.registrationNumber ||
        !ngoDetails.contactPerson ||
        !ngoDetails.address
      ) {
        return res.status(400).json({
          success: false,
          message:
            "NGO registration requires NGO name, registration number, contact person, and address."
        });
      }
      sanitizedNgoDetails = {
        ngoName: ngoDetails.ngoName.trim(),
        registrationNumber: ngoDetails.registrationNumber.trim(),
        contactPerson: ngoDetails.contactPerson.trim(),
        address: ngoDetails.address.trim(),
        organizationDetails: (ngoDetails.organizationDetails || "").trim()
      };
    }

    // 5. Create user (NGOs start with PENDING status)
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone.trim(),
      role: normalizedRole,
      donorDetails: sanitizedDonorDetails,
      ngoDetails: sanitizedNgoDetails,
      ngoVerificationStatus: normalizedRole === "NGO" ? "PENDING" : "VERIFIED",
      accountStatus: "ACTIVE"
    });

    await newUser.save();

    // 6. Generate token
    const token = generateToken(newUser._id, newUser.role);

    return res.status(201).json({
      success: true,
      message: `${normalizedRole} registration successful.${
        normalizedRole === "NGO" ? " Your NGO account is pending admin verification." : ""
      }`,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        donorDetails: newUser.donorDetails,
        ngoDetails: newUser.ngoDetails,
        ngoVerificationStatus: newUser.ngoVerificationStatus,
        accountStatus: newUser.accountStatus,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * User login with email and password
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Query user with password included
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    if (user.accountStatus !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact support."
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        donorDetails: user.donorDetails,
        ngoDetails: user.ngoDetails,
        ngoVerificationStatus: user.ngoVerificationStatus,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Retrieve currently logged-in user details
 */
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user
  });
};

/**
 * POST /api/auth/logout
 * Acknowledge user logout
 */
export const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
};
