import type { Request, Response } from "express";
import mongoose from "mongoose";

import SavingsGoal from "../models/savingsGoalModel.js";
import type { SavingsGoalStatus } from "../models/savingsGoalModel.js";

// fields clients are allowed to create or update.
interface SavingsGoalInput {
  name?: string;
  description?: string;
  targetAmount?: number;
  savedAmount?: number;
  deadline?: Date | null;
  icon?: string;
  color?: string;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  data?: SavingsGoalInput;
}

// validate goal fields without trusting client-supplied user or status.
const validateSavingsGoalInput = (
  body: unknown,
  partial = false,
): ValidationResult => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      valid: false,
      message: "Please provide valid goal data.",
    };
  }

  const input = body as Record<string, unknown>;
  const allowedFields = [
    "name",
    "description",
    "targetAmount",
    "savedAmount",
    "deadline",
    "icon",
    "color",
  ];

  if (Object.keys(input).some((key) => !allowedFields.includes(key))) {
    return {
      valid: false,
      message: "One or more fields are not allowed.",
    };
  }

  if (
    !partial &&
    (typeof input.name !== "string" || typeof input.targetAmount !== "number")
  ) {
    return {
      valid: false,
      message: "Goal name and target amount are required.",
    };
  }

  if (partial && Object.keys(input).length === 0) {
    return {
      valid: false,
      message: "Provide at least one field to update.",
    };
  }

  const data: SavingsGoalInput = {};

  if ("name" in input) {
    if (typeof input.name !== "string") {
      return { valid: false, message: "Goal name must be text." };
    }

    const name = input.name.trim();

    if (name.length < 2 || name.length > 60) {
      return {
        valid: false,
        message: "Goal name must be between 2 and 60 characters.",
      };
    }

    data.name = name;
  }

  if ("description" in input) {
    if (typeof input.description !== "string") {
      return {
        valid: false,
        message: "Description must be text.",
      };
    }

    const description = input.description.trim();

    if (description.length > 250) {
      return {
        valid: false,
        message: "Description cannot exceed 250 characters.",
      };
    }

    data.description = description;
  }

  if ("targetAmount" in input) {
    if (
      typeof input.targetAmount !== "number" ||
      !Number.isFinite(input.targetAmount) ||
      input.targetAmount <= 0
    ) {
      return {
        valid: false,
        message: "Target amount must be a number greater than zero.",
      };
    }

    data.targetAmount = input.targetAmount;
  }

  if ("savedAmount" in input) {
    if (
      typeof input.savedAmount !== "number" ||
      !Number.isFinite(input.savedAmount) ||
      input.savedAmount < 0
    ) {
      return {
        valid: false,
        message: "Saved amount must be a non-negative finite number.",
      };
    }

    data.savedAmount = input.savedAmount;
  }

  if ("deadline" in input) {
    if (input.deadline === null) {
      data.deadline = null;
    } else if (typeof input.deadline === "string") {
      const deadline = new Date(input.deadline);

      if (!Number.isFinite(deadline.getTime())) {
        return {
          valid: false,
          message: "Please provide a valid deadline.",
        };
      }

      data.deadline = deadline;
    } else {
      return {
        valid: false,
        message: "Deadline must be a valid date or null.",
      };
    }
  }

  if ("icon" in input) {
    if (
      typeof input.icon !== "string" ||
      input.icon.trim().length === 0 ||
      input.icon.trim().length > 50
    ) {
      return {
        valid: false,
        message: "Icon must be a non-empty string of at most 50 characters.",
      };
    }

    data.icon = input.icon.trim();
  }

  if ("color" in input) {
    if (
      typeof input.color !== "string" ||
      input.color.trim().length === 0 ||
      input.color.trim().length > 30
    ) {
      return {
        valid: false,
        message: "Color must be a non-empty string of at most 30 characters.",
      };
    }

    data.color = input.color.trim();
  }

  return { valid: true, data };
};

// derive goal status from its saved and target amounts.
const getGoalStatus = (
  savedAmount: number,
  targetAmount: number,
): SavingsGoalStatus => (savedAmount >= targetAmount ? "completed" : "active");

// create a savings goal.
export const createSavingsGoalController = async (
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

    const validation = validateSavingsGoalInput(req.body);

    if (!validation.valid || !validation.data) {
      res.status(400).json({
        success: false,
        message: validation.message,
      });
      return;
    }

    const data = validation.data;
    const targetAmount = data.targetAmount!;
    const savedAmount = data.savedAmount ?? 0;

    if (savedAmount > targetAmount) {
      res.status(400).json({
        success: false,
        message: "Saved amount cannot exceed the target amount.",
      });
      return;
    }

    const goal = await SavingsGoal.create({
      user: req.user.userId,
      ...data,
      status: getGoalStatus(savedAmount, targetAmount),
    });

    res.status(201).json({
      success: true,
      message: "Savings goal created successfully!",
      data: goal,
    });
  } catch (error: unknown) {
    console.error("Create savings goal error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create savings goal.",
    });
  }
};

// retrieve all savings goals belonging to the logged-in user.
export const getSavingsGoalsController = async (
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

    const goals = await SavingsGoal.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Savings goals retrieved successfully!",
      count: goals.length,
      data: goals,
    });
  } catch (error: unknown) {
    console.error("Get savings goals error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve savings goals.",
    });
  }
};

// update a savings goal.
export const updateSavingsGoalController = async (
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

    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid savings goal ID.",
      });
      return;
    }

    const validation = validateSavingsGoalInput(req.body, true);

    if (!validation.valid || !validation.data) {
      res.status(400).json({
        success: false,
        message: validation.message,
      });
      return;
    }

    const goal = await SavingsGoal.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!goal) {
      res.status(404).json({
        success: false,
        message: "Savings goal not found.",
      });
      return;
    }

    // check the resulting amounts, not just the submitted fields.
    const targetAmount = validation.data.targetAmount ?? goal.targetAmount;
    const savedAmount = validation.data.savedAmount ?? goal.savedAmount;

    if (savedAmount > targetAmount) {
      res.status(400).json({
        success: false,
        message: "Saved amount cannot exceed the target amount.",
      });
      return;
    }

    goal.set(validation.data);
    goal.status = getGoalStatus(savedAmount, targetAmount);

    await goal.save();

    res.status(200).json({
      success: true,
      message: "Savings goal updated successfully!",
      data: goal,
    });
  } catch (error: unknown) {
    console.error("Update savings goal error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update savings goal.",
    });
  }
};

// delete a savings goal.
export const deleteSavingsGoalController = async (
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

    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid savings goal ID.",
      });
      return;
    }

    const deletedGoal = await SavingsGoal.findOneAndDelete({
      _id: id,
      user: req.user.userId,
    });

    if (!deletedGoal) {
      res.status(404).json({
        success: false,
        message: "Savings goal not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Savings goal deleted successfully!",
      data: deletedGoal,
    });
  } catch (error: unknown) {
    console.error("Delete savings goal error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete savings goal.",
    });
  }
};
