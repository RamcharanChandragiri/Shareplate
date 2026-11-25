import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import connectDB from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

/**
 * Secure Provisioning Script for Admin User
 * Usage: node server/scripts/seedAdmin.js
 */
const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@shareplate.org";
    const adminPassword = process.env.ADMIN_PASSWORD || "AdminSharePlate2026!";
    const adminName = process.env.ADMIN_NAME || "System Administrator";
    const adminPhone = process.env.ADMIN_PHONE || "9999999999";

    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });

    if (existingAdmin) {
      console.log(`Admin account already exists for ${adminEmail}. Updating role to ADMIN.`);
      existingAdmin.role = "ADMIN";
      existingAdmin.accountStatus = "ACTIVE";
      await existingAdmin.save();
      console.log("Admin account confirmed active.");
    } else {
      const newAdmin = new User({
        name: adminName,
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        phone: adminPhone,
        role: "ADMIN",
        accountStatus: "ACTIVE"
      });
      await newAdmin.save();
      console.log(`Admin account provisioned successfully: ${adminEmail}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Admin provisioning error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
