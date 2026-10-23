import type { Request, Response } from "express";
import mongoose from "mongoose";

import Budget, {
  budgetCategories,
  type BudgetCategory,
  type BudgetType,
} from "../models/budgetModel.js";
import Transaction from "../models/transactionModel.js";

// validate the month and year shared by budget operations.
const isValidMonthYear = (month: unknown, year: unknown): boolean => {
  return (
    typeof month === "number" &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12 &&
    typeof year === "number" &&
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 9999
  );
};

// validate budget type, category, amount, month, and year.
const validateBudgetInput = (
  body: Record<string, unknown>,
): {
  valid: boolean;
  message?: string;
  data?: {
    type: BudgetType;
    category: string;
    amount: number;
    month: number;
    year: number;
  };
} => {
  const { type, category, amount, month, year } = body;

  if (type !== "overall" && type !== "category") {
    return {
      valid: false,
      message: "Budget type must be overall or category.",
    };
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return {
      valid: false,
      message: "Budget amount must be a number greater than zero.",
    };
  }

  if (
    typeof month !== "number" ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    typeof year !== "number" ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 9999
  ) {
    return {
      valid: false,
      message: "Please provide a valid month and year.",
    };
  }

  let normalizedCategory = "";

  if (type === "category") {
    if (
      typeof category !== "string" ||
      !budgetCategories.includes(category as BudgetCategory)
    ) {
      return {
        valid: false,
        message: "Please provide a valid budget category.",
      };
    }

    normalizedCategory = category;
  }

  return {
    valid: true,
    data: {
      type,
      category: normalizedCategory,
      amount,
      month,
      year,
    },
  };
};

// handle duplicate budget errors from MongoDB's unique index.
const isDuplicateKeyError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
};

// create a budget.
export const createBudgetController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const validation = validateBudgetInput(req.body);

    if (!validation.valid || !validation.data) {
      res.status(400).json({
        success: false,
        message: validation.message,
      });
      return;
    }

    const budget = await Budget.create({
      user: req.user.userId,
      ...validation.data,
    });

    res.status(201).json({
      success: true,
      message: "Budget created successfully!",
      data: budget,
    });
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({
        success: false,
        message: "A budget already exists for this type, category, and month.",
      });
      return;
    }

    console.error("Create budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create budget.",
    });
  }
};

// get budgets for a selected month and calculate spending.
export const getBudgetsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    // query parameters arrive as strings.
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (
      req.query.month === undefined ||
      req.query.year === undefined ||
      !isValidMonthYear(month, year)
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid month and year.",
      });
      return;
    }

    const budgets = await Budget.find({
      user: req.user.userId,
      month,
      year,
    }).sort({ type: 1, category: 1 });

    // use UTC calendar-month boundaries consistently.
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    // sum expenses by category for the selected month.
    const spending = await Transaction.aggregate<{
      _id: string;
      total: number;
    }>([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.userId),
          type: "expense",
          date: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const spendingByCategory = new Map(
      spending.map((item) => [item._id, item.total]),
    );

    const totalSpent = spending.reduce((total, item) => total + item.total, 0);

    // add calculated values without storing them in the Budget model.
    const budgetsWithSpending = budgets.map((budget) => {
      const spent =
        budget.type === "overall"
          ? totalSpent
          : (spendingByCategory.get(budget.category) ?? 0);

      return {
        ...budget.toObject(),
        spent,
        remaining: budget.amount - spent,
        percentageUsed: Number(((spent / budget.amount) * 100).toFixed(2)),
      };
    });

    res.status(200).json({
      success: true,
      message: "Budgets retrieved successfully!",
      count: budgetsWithSpending.length,
      data: budgetsWithSpending,
    });
  } catch (error: unknown) {
    console.error("Get budgets error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve budgets.",
    });
  }
};

// update a budget.
export const updateBudgetController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid budget ID.",
      });
      return;
    }

    const validation = validateBudgetInput(req.body);

    if (!validation.valid || !validation.data) {
      res.status(400).json({
        success: false,
        message: validation.message,
      });
      return;
    }

    const updatedBudget = await Budget.findOneAndUpdate(
      {
        _id: id,
        user: req.user.userId,
      },
      validation.data,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedBudget) {
      res.status(404).json({
        success: false,
        message: "Budget not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Budget updated successfully!",
      data: updatedBudget,
    });
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({
        success: false,
        message: "A budget already exists for this type, category, and month.",
      });
      return;
    }

    console.error("Update budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update budget.",
    });
  }
};

// delete a budget.
export const deleteBudgetController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid budget ID.",
      });
      return;
    }

    const deletedBudget = await Budget.findOneAndDelete({
      _id: id,
      user: req.user.userId,
    });

    if (!deletedBudget) {
      res.status(404).json({
        success: false,
        message: "Budget not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Budget deleted successfully!",
      data: deletedBudget,
    });
  } catch (error: unknown) {
    console.error("Delete budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete budget.",
    });
  }
};
