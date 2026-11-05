import express from "express";

import {
  registerController,
  loginController,
  logoutController,
  googleLoginController,
  forgotPasswordController,
  resetPasswordController,
} from "../controllers/authController.js";

const authRouter = express.Router();

// google login
authRouter.post("/google", googleLoginController);

// register
authRouter.post("/register", registerController);

// login
authRouter.post("/login", loginController);

// logout
authRouter.post("/logout", logoutController);

// forgot password
authRouter.post("/forgot-password", forgotPasswordController);

// reset password
authRouter.post("/reset-password/:token", resetPasswordController);

export default authRouter;
