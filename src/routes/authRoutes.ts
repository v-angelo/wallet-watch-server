import express from "express";

import {
  registerController,
  loginController,
  logoutController,
  googleLoginController,
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

export default authRouter;
