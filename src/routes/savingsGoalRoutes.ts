import { Router } from "express";

import {
  createSavingsGoalController,
  getSavingsGoalsController,
  updateSavingsGoalController,
  deleteSavingsGoalController,
} from "../controllers/savingsGoalController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

const sgRouter = Router();

sgRouter.use(authMiddleware);

// create a goal
sgRouter.post("/", createSavingsGoalController);

// retrieve the user's goals
sgRouter.get("/", getSavingsGoalsController);

// update goal details or saved amount
sgRouter.patch("/:id", updateSavingsGoalController);

// delete a goal
sgRouter.delete("/:id", deleteSavingsGoalController);

export default sgRouter;
