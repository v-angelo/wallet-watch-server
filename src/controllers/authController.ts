import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";

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
