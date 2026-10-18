import { Router } from "express";

import {
  changePasswordController,
  getCurrentUserController,
  updatePreferencesController,
  updateProfileController,
} from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const userRouter = Router();

// all routes below require authentication
userRouter.use(authMiddleware);

// current user's profile
userRouter.get("/me", getCurrentUserController);

// update profile details
userRouter.patch("/me/profile", updateProfileController);

// update preferences
userRouter.patch("/me/preferences", updatePreferencesController);

// change password
userRouter.patch("/me/password", changePasswordController);

export default userRouter;
