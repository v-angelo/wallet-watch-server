import { Router } from "express";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

import {
  deleteUserController,
  getAdminStatsController,
  getAllUsersController,
  updateUserStatusController,
} from "../controllers/adminController.js";

const adminRouter = Router();

adminRouter.use(authMiddleware, adminMiddleware);

// get all stats
adminRouter.get("/stats", getAdminStatsController);

// get all users
adminRouter.get("/users", getAllUsersController);

// update user active status
adminRouter.patch("/users/:id/status", updateUserStatusController);

// delete user
adminRouter.delete("/users/:id", deleteUserController);

export default adminRouter;
