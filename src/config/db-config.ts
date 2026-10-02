import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const connectionString = process.env.MONGODB_CS;

    if (!connectionString) {
      throw new Error("MONGODB_CS is not defined");
    }

    await mongoose.connect(connectionString);

    console.log("MongoDB Connected!");
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("DB Connection Error:", error.message);
    } else {
      console.error("DB Connection Error:", error);
    }

    process.exit(1);
  }
};

export default connectDB;
