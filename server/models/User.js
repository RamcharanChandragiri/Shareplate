import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        "Please provide a valid email address"
      ],
      index: true
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true
    },
    role: {
      type: String,
      enum: {
        values: ["DONOR", "NGO", "ADMIN"],
        message: "{VALUE} is not a valid user role"
      },
      default: "DONOR"
    },
    donorDetails: {
      organizationName: { type: String, trim: true },
      organizationType: {
        type: String,
        enum: ["RESTAURANT", "HOTEL", "CAFETERIA", "EVENT_ORGANIZER", "INDIVIDUAL", "OTHER"],
        default: "OTHER"
      },
      address: { type: String, trim: true }
    },
    ngoDetails: {
      ngoName: { type: String, trim: true },
      registrationNumber: { type: String, trim: true },
      contactPerson: { type: String, trim: true },
      address: { type: String, trim: true },
      organizationDetails: { type: String, trim: true }
    },
    ngoVerificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING"
    },
    accountStatus: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE"
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Pre-save hook to hash password with bcrypt (async without next in modern Mongoose)
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
