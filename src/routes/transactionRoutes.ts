import { Router } from "express";
import {
  createTransactionController,
  deleteTransactionController,
  getTransactionsController,
  updateTransactionController,
} from "../controllers/transactionController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const transactionRouter = Router();

// create a transaction
transactionRouter.post("/", authMiddleware, createTransactionController);

// get all transactions belonging to the logged-in user
transactionRouter.get("/", authMiddleware, getTransactionsController);

// update a transaction
transactionRouter.put("/:id", authMiddleware, updateTransactionController);

// delete a transaction
transactionRouter.delete("/:id", authMiddleware, deleteTransactionController);

export default transactionRouter;
