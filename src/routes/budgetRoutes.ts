import { Router } from "express";
import {
  createBudgetController,
  getBudgetsController,
  updateBudgetController,
  deleteBudgetController,
} from "../controllers/budgetController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const budgetRouter = Router();

// create a budget.
budgetRouter.post("/", authMiddleware, createBudgetController);

// get budgets for a selected month and year.
budgetRouter.get("/", authMiddleware, getBudgetsController);

// update a budget by ID.
budgetRouter.put("/:id", authMiddleware, updateBudgetController);

// delete a budget by ID.
budgetRouter.delete("/:id", authMiddleware, deleteBudgetController);

export default budgetRouter;
