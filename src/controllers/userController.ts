import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import type { Request, Response } from "express";

// get current user's profile
export const getCurrentUserController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user.",
      data: error instanceof Error ? error.message : error,
    });
  }
};

// update username and profile picture
export const updateProfileController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const { username, profilePic } = req.body;

    // reject requests containing unsupported fields
    const allowedFields = ["username", "profilePic"];
    const invalidFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      res.status(400).json({
        success: false,
        message: "Unsupported profile fields provided.",
      });
      return;
    }

    const updates: { username?: string; profilePic?: string } = {};

    if (username !== undefined) {
      if (typeof username !== "string") {
        res.status(400).json({
          success: false,
          message: "Username must be a string.",
        });
        return;
      }

      const trimmedUsername = username.trim();

      if (trimmedUsername.length < 2 || trimmedUsername.length > 30) {
        res.status(400).json({
          success: false,
          message: "Username must be between 2 and 30 characters.",
        });
        return;
      }

      updates.username = trimmedUsername;
    }

    if (profilePic !== undefined) {
      if (typeof profilePic !== "string" || profilePic.length > 2048) {
        res.status(400).json({
          success: false,
          message: "Invalid profile picture URL.",
        });
        return;
      }

      if (profilePic !== "") {
        try {
          const url = new URL(profilePic);

          if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("Invalid protocol");
          }
        } catch {
          res.status(400).json({
            success: false,
            message: "Profile picture must be a valid HTTP(S) URL.",
          });
          return;
        }
      }

      updates.profilePic = profilePic;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        message: "No profile changes provided.",
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      data: user,
    });
  } catch (error: unknown) {
    console.error("Profile update failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};

// update user preferences
export const updatePreferencesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const { currency, preferredTheme, dateFormat } = req.body;

    const allowedFields = ["currency", "preferredTheme", "dateFormat"];

    const invalidFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      res.status(400).json({
        success: false,
        message: "Unsupported preference fields provided.",
      });
      return;
    }

    const supportedCurrencies = ["INR", "USD", "EUR", "GBP", "CAD", "AUD"];

    const supportedThemes = ["light", "dark"];

    const supportedDateFormats = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

    if (Object.keys(req.body).length === 0) {
      res.status(400).json({
        success: false,
        message: "No preferences provided.",
      });
      return;
    }

    if (currency !== undefined && !supportedCurrencies.includes(currency)) {
      res.status(400).json({
        success: false,
        message: "Unsupported currency.",
      });
      return;
    }

    if (
      preferredTheme !== undefined &&
      !supportedThemes.includes(preferredTheme)
    ) {
      res.status(400).json({
        success: false,
        message: "Theme must be light or dark.",
      });
      return;
    }

    if (
      dateFormat !== undefined &&
      !supportedDateFormats.includes(dateFormat)
    ) {
      res.status(400).json({
        success: false,
        message: "Unsupported date format.",
      });
      return;
    }

    const updates: {
      currency?: string;
      preferredTheme?: "light" | "dark";
      dateFormat?: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
    } = {};

    if (currency !== undefined) updates.currency = currency;
    if (preferredTheme !== undefined) {
      updates.preferredTheme = preferredTheme;
    }
    if (dateFormat !== undefined) updates.dateFormat = dateFormat;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Preferences updated successfully!",
      data: user,
    });
  } catch (error: unknown) {
    console.error("Preference update failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update preferences.",
    });
  }
};

// change password for local accounts
export const changePasswordController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      res.status(400).json({
        success: false,
        message: "New password must be between 8 and 72 characters.",
      });
      return;
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    if (user.provider !== "local" || !user.password) {
      res.status(400).json({
        success: false,
        message: "Password changes are not available for this account.",
      });
      return;
    }

    const isPasswordMatch = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordMatch) {
      res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({
        success: false,
        message: "New password must differ from the current password.",
      });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error: unknown) {
    console.error("Password change failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to change password.",
    });
  }
};
