import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";

import crypto from "crypto";
import { sendPasswordResetEmail } from "../services/emailService.js";

import type { Request, Response } from "express";

import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// google login
export const googleLoginController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({
        success: false,
        message: "Google credential is required",
      });

      return;
    }

    // verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email || !payload.email_verified) {
      res.status(401).json({
        success: false,
        message: "Invalid Google account information",
      });

      return;
    }

    const { sub: googleId, email, name, picture } = payload;

    // find existing Google account
    let existingUser = await User.findOne({ googleId });

    if (!existingUser) {
      // check whether email already belongs to another account
      const emailUser = await User.findOne({ email });

      if (emailUser) {
        res.status(409).json({
          success: false,
          message:
            "An account with this email already exists. Please sign in using your existing login method.",
        });

        return;
      }

      // create a new Google user
      const username = (name || email.split("@")[0]).slice(0, 30);

      existingUser = await User.create({
        username,
        email,
        googleId,
        profilePic: picture || "",
        password: "",
        provider: "google",
      });
    }

    // check account status
    if (!existingUser.isActive) {
      res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact an administrator.",
      });

      return;
    }

    // generate WalletWatch JWT
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
      {
        userId: existingUser._id,
        role: existingUser.role,
        tokenVersion: existingUser.tokenVersion,
      },
      jwtSecret,
      {
        expiresIn: "1d",
      },
    );

    // remove password before sending response
    const userData = existingUser.toObject();

    const { password: __, ...safeUserData } = userData;

    // store JWT in HttpOnly cookie
    res.cookie("walletwatch_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Google login successful!",
      data: safeUserData,
    });
  } catch (error: unknown) {
    console.error("Google login error:", error);

    res.status(401).json({
      success: false,
      message: "Google authentication failed!",
    });
  }
};

// register
export const registerController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  console.log("Inside registerController");

  try {
    const { username, email, password } = req.body;

    // validation
    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Username, email and password are required",
      });

      return;
    }

    // check existing user
    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "User already exists... Please Login!",
      });

      return;
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      provider: "local",
    });

    // remove password before sending response
    const userData = newUser.toObject();

    const { password: __, ...safeUserData } = userData;

    // send response
    res.status(201).json({
      success: true,
      message: "Registered Successfully!!",
      data: safeUserData,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Registration failed!",
      data: error instanceof Error ? error.message : error,
    });
  }
};

// login
export const loginController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  console.log("Inside loginController");

  try {
    const { email, password } = req.body;

    // validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });

      return;
    }

    // check user exists
    const existingUser = await User.findOne({
      email,
    });

    if (!existingUser) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password!",
      });

      return;
    }

    if (!existingUser.isActive) {
      res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact an administrator.",
      });
      return;
    }

    if (existingUser.provider === "google") {
      res.status(400).json({
        success: false,
        message:
          "This account uses Google Sign-In. Please continue with Google.",
      });

      return;
    }

    // compare passwords
    const isPasswordMatch = await bcrypt.compare(
      password,
      existingUser.password,
    );

    if (!isPasswordMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password!",
      });

      return;
    }

    // generate token
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
      {
        userId: existingUser._id,
        role: existingUser.role,
        tokenVersion: existingUser.tokenVersion,
      },
      jwtSecret,
      {
        expiresIn: "1d",
      },
    );

    // remove password before sending response
    const userData = existingUser.toObject();

    const { password: __, ...safeUserData } = userData;

    // store JWT in HttpOnly cookie
    res.cookie("walletwatch_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // send response
    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: safeUserData,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Login failed!",
      data: error instanceof Error ? error.message : error,
    });
  }
};

// logout
export const logoutController = (req: Request, res: Response): void => {
  res.clearCookie("walletwatch_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully!",
  });
};

// forgot password
export const forgotPasswordController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({
        success: false,
        message: "Email is required.",
      });

      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // find an active local account
    const user = await User.findOne({
      email: normalizedEmail,
      provider: "local",
      isActive: true,
    });

    // generic response to prevent email enumeration
    const successResponse = {
      success: true,
      message:
        "If an account exists with that email address, you will receive a password reset link shortly.",
    };

    if (!user) {
      res.status(200).json(successResponse);
      return;
    }

    // generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // hash the token before storing it
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // set token expiration (15 minutes)
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = resetExpires;

    await user.save();

    // construct reset URL
    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL is not configured");
    }

    const resetUrl = new URL("/reset-password", frontendUrl);

    resetUrl.searchParams.set("token", resetToken);

    // send reset email
    try {
      await sendPasswordResetEmail(normalizedEmail, resetUrl.toString());
    } catch (emailError) {
      // invalidate token if email delivery fails
      await User.updateOne(
        {
          _id: user._id,
          resetPasswordToken: hashedToken,
        },
        {
          $unset: {
            resetPasswordToken: 1,
            resetPasswordExpires: 1,
          },
        },
      );

      throw emailError;
    }

    res.status(200).json(successResponse);
  } catch (error: unknown) {
    console.error("Forgot password error:", error);

    res.status(500).json({
      success: false,
      message:
        "Unable to process your password reset request. Please try again later.",
    });
  }
};

// reset password
export const resetPasswordController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const token = req.params.token;
    const { password } = req.body;

    // validate token
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired password reset link.",
      });

      return;
    }

    // validate password
    if (typeof password !== "string") {
      res.status(400).json({
        success: false,
        message: "Password is required.",
      });

      return;
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and no more than 72 bytes.",
      });

      return;
    }

    // hash the received token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // validate token and update password
    const updatedUser = await User.findOneAndUpdate(
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
        provider: "local",
        isActive: true,
      },
      {
        $set: {
          password: hashedPassword,
        },
        $inc: {
          tokenVersion: 1,
        },
        $unset: {
          resetPasswordToken: 1,
          resetPasswordExpires: 1,
        },
      },
      {
        new: true,
      },
    );

    if (!updatedUser) {
      res.status(400).json({
        success: false,
        message:
          "Invalid or expired password reset link. Please request a new one.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message:
        "Password reset successful! Please log in with your new password.",
    });
  } catch (error: unknown) {
    console.error("Reset password error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to reset password. Please try again later.",
    });
  }
};
