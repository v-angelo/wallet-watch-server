import mongoose from "mongoose";

export type Theme = "light" | "dark";

export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export interface IUser {
  username: string;
  email: string;
  password: string;
  provider: "local" | "google";
  profilePic: string;
  currency: string;
  preferredTheme: Theme;
  dateFormat: DateFormat;
  role: "user" | "admin";
  isActive: boolean;
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
      enum: ["INR", "USD", "EUR", "GBP", "CAD", "AUD"],
      default: "INR",
    },

    preferredTheme: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },

    dateFormat: {
      type: String,
      enum: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
      default: "DD/MM/YYYY",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;
