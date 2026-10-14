import { Router } from "express";
import {
  createTransactionController,
  getTransactionsController,
} from "../controllers/transactionController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const transactionRouter = Router();

// create a transaction
transactionRouter.post("/", authMiddleware, createTransactionController);

// get all transactions belonging to the logged-in user
transactionRouter.get("/", authMiddleware, getTransactionsController);

export default transactionRouter;
