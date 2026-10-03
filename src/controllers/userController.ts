import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

// register user
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

    const { password: removedPassword, ...safeUserData } = userData;

    // send response
    res.status(201).json({
      success: true,
      message: "Registered Successfully!!",
      data: safeUserData,
    });

    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        message: "Registration failed!",
        data: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Registration failed!",
        data: error,
      });
    }
  }
};

// login user
export const loginController = async (
  req: Request,
  res: Response,
): Promise<any> => {
  console.log("Inside loginController");

  try {
    const { email, password } = req.body;

    // validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // check user exists
    const existingUser: any = await User.findOne({
      email,
    });

    if (existingUser.provider === "google") {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google Sign-In. Please continue with Google.",
      });
    }

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Invalid Email... Please Register to access Memoir!!",
      });
    }

    if (!existingUser.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled",
      });
    }

    // compare passwords
    const isPasswordMatch = await bcrypt.compare(
      password,
      existingUser.password,
    );

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/password!",
      });
    }

    // generate token
    const jwtSecret: string = process.env.JWT_SECRET || "";

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

    const { password: removedPassword, ...safeUserData } = userData;

    // response object
    const data = {
      user: safeUserData,
      token,
    };

    // send response
    res.status(200).json({
      success: true,
      message: "Login succesful!",
      data,
    });

    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        message: "Login failed!",
        data: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Login failed!",
        data: error,
      });
    }
  }
};
