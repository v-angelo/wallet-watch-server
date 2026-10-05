import express from "express";

import {
  registerController,
  loginController,
} from "../controllers/authController.js";

const authRouter = express.Router();

// register
authRouter.post("/register", registerController);

// login
authRouter.post("/login", loginController);

export default authRouter;
