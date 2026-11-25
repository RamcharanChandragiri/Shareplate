import mongoose from "mongoose";

/**
 * Connect to MongoDB using Mongoose
 * Reads MONGO_URI from environment variables.
 * Throws an error if MONGO_URI is missing or if connection fails.
 */
const connectDB = async () => {
  let mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    throw new Error(
      "MONGO_URI is not defined in environment variables. Please configure MONGO_URI in your server/.env file."
    );
  }

  // Check for unreplaced template placeholders
  if (
    mongoURI.includes("<db_username>") ||
    mongoURI.includes("<username>") ||
    mongoURI.includes("<db_password>") ||
    mongoURI.includes("<password>")
  ) {
    throw new Error(
      "MONGO_URI contains placeholder tokens (such as <db_username> or <db_password>). Please replace them with your actual MongoDB Atlas Database User credentials in server/.env (omit the '<' and '>')."
    );
  }

  // Defensively strip any accidental enclosing '<' and '>' around username or password
  mongoURI = mongoURI.replace(
    /^(mongodb(?:\+srv)?:\/\/)(?:<([^:>]+)>|([^:>]+)):(?:<([^@>]+)>|([^@>]+))(@.*)$/,
    (match, protocol, bUser, rUser, bPass, rPass, rest) => {
      const user = bUser || rUser;
      const pass = bPass || rPass;
      return `${protocol}${user}:${pass}${rest}`;
    }
  );

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};

export default connectDB;
