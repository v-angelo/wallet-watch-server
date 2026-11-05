import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

interface JwtPayload {
  userId: string;
  role: string;
  tokenVersion?: number;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies.walletwatch_token;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });

      return;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    const user = await User.findById(decoded.userId).select(
      "_id role isActive tokenVersion",
    );

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Account is inactive or no longer exists.",
      });
      return;
    }

    // validate token version
    if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) {
      res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
      });

      return;
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};
