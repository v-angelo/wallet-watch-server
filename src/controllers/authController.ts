import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";

import type { Request, Response } from "express";

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
      res.status(404).json({
        success: false,
        message: "Invalid email or password!",
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

    // response object
    const data = {
      user: safeUserData,
      token,
    };

    // send response
    res.status(200).json({
      success: true,
      message: "Login successful!",
      data,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Login failed!",
      data: error instanceof Error ? error.message : error,
    });
  }
};
