import type { Request, Response } from "express";
import Transaction from "../models/transactionModel.js";

// create transaction
export const createTransactionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // check authentication
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });

      return;
    }

    const { title, amount, type, category, date, notes, paymentMethod } =
      req.body;

    // validate required fields
    if (
      typeof title !== "string" ||
      !title.trim() ||
      amount === undefined ||
      amount === null ||
      !type ||
      typeof category !== "string" ||
      !category.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Title, amount, type and category are required.",
      });

      return;
    }

    // validate title
    if (title.trim().length < 2 || title.trim().length > 100) {
      res.status(400).json({
        success: false,
        message: "Title must be between 2 and 100 characters.",
      });

      return;
    }

    // validate amount
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Amount must be a number greater than zero.",
      });

      return;
    }

    // validate transaction type
    if (!["income", "expense"].includes(type)) {
      res.status(400).json({
        success: false,
        message: "Type must be either income or expense.",
      });

      return;
    }

    // validate category
    if (category.trim().length > 50) {
      res.status(400).json({
        success: false,
        message: "Category cannot exceed 50 characters.",
      });

      return;
    }

    // validate notes
    if (
      notes !== undefined &&
      (typeof notes !== "string" || notes.length > 500)
    ) {
      res.status(400).json({
        success: false,
        message: "Notes must be text and cannot exceed 500 characters.",
      });

      return;
    }

    // validate payment method
    const allowedPaymentMethods = [
      "cash",
      "card",
      "upi",
      "bank transfer",
      "other",
    ];

    if (
      paymentMethod !== undefined &&
      !allowedPaymentMethods.includes(paymentMethod)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });

      return;
    }

    // validate date if provided
    let transactionDate: Date | undefined;

    if (date !== undefined) {
      if (
        typeof date !== "string" ||
        date.trim() === "" ||
        !Number.isFinite(Date.parse(date))
      ) {
        res.status(400).json({
          success: false,
          message: "Please provide a valid transaction date.",
        });

        return;
      }

      transactionDate = new Date(date);
    }

    // create transaction
    const newTransaction = await Transaction.create({
      user: req.user.userId,
      title: title.trim(),
      amount,
      type,
      category: category.trim(),
      ...(transactionDate && { date: transactionDate }),
      notes: notes?.trim() ?? "",
      paymentMethod: paymentMethod ?? "other",
    });

    // send response
    res.status(201).json({
      success: true,
      message: "Transaction created successfully!",
      data: newTransaction,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Failed to create transaction.",
      data: error instanceof Error ? error.message : error,
    });
  }
};

// get all transactions belonging to the logged-in user
export const getTransactionsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // check authentication
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });

      return;
    }

    // retrieve user's transactions, newest first
    const transactions = await Transaction.find({
      user: req.user.userId,
    }).sort({
      date: -1,
      createdAt: -1,
    });

    // send response
    res.status(200).json({
      success: true,
      message: "Transactions retrieved successfully!",
      count: transactions.length,
      data: transactions,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve transactions.",
      data: error instanceof Error ? error.message : error,
    });
  }
};
