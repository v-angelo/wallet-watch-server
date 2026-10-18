import express from "express";

import {
  registerController,
  loginController,
  logoutController,
} from "../controllers/authController.js";

const authRouter = express.Router();

// register
authRouter.post("/register", registerController);

// login
authRouter.post("/login", loginController);

// logout
authRouter.post("/logout", logoutController);

export default authRouter;
