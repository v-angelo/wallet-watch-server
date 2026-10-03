import mongoose from "mongoose";

interface IUser {
  username: string;
  email: string;
  password: string;
  provider: "local" | "google";
  profilePic: string;
  currency: string;
  role: "user" | "admin";
}

const userSchema = new mongoose.Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      default: "",
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    profilePic: {
      type: String,
      default: "",
    },

    currency: {
      type: String,
      default: "USD",
    },

    role: {
      type: String,
      default: "user",
      enum: ["user", "admin"],
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
