import express from "express";

import { authMiddleware } from "../middlewares/authMiddleware.js";

import {
  registerController,
  loginController,
  logoutController,
  currentUserController,
} from "../controllers/authController.js";

const authRouter = express.Router();

// register
authRouter.post("/register", registerController);

// login
authRouter.post("/login", loginController);

// current user
authRouter.get("/me", authMiddleware, currentUserController);

// logout
authRouter.post("/logout", logoutController);

export default authRouter;
