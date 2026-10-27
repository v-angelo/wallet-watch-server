import type { Request, Response } from "express";
import mongoose from "mongoose";

import User from "../models/userModel.js";
import Transaction from "../models/transactionModel.js";
import Budget from "../models/budgetModel.js";
import SavingsGoal from "../models/savingsGoalModel.js";

// GET /api/admin/stats
export const getAdminStatsController = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalTransactions,
      totalBudgets,
      totalSavingsGoals,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: { $ne: true } }),
      Transaction.countDocuments(),
      Budget.countDocuments(),
      SavingsGoal.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalTransactions,
        totalBudgets,
        totalSavingsGoals,
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch admin statistics.",
    });
  }
};

// GET /api/admin/users
export const getAllUsersController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const status =
      typeof req.query.status === "string" ? req.query.status : "all";

    const pageValue = Number(req.query.page ?? 1);
    const limitValue = Number(req.query.limit ?? 10);

    if (
      !Number.isSafeInteger(pageValue) ||
      !Number.isSafeInteger(limitValue) ||
      pageValue < 1 ||
      limitValue < 1 ||
      !["all", "active", "inactive"].includes(status)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid pagination or status filter.",
      });
      return;
    }

    const page = pageValue;
    const limit = Math.min(limitValue, 50);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { username: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = { $ne: true };
    }

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          totalUsers,
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
    });
  }
};

// PATCH /api/admin/users/:id/status
export const updateUserStatusController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
      return;
    }

    if (typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isActive must be a boolean.",
      });
      return;
    }

    if (req.user?.userId === id) {
      res.status(400).json({
        success: false,
        message: "You cannot change your own account status.",
      });
      return;
    }

    const targetUser = await User.findById(id).select(
      "_id username email role isActive",
    );

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    // do not deactivate the last active admin.
    if (!isActive && targetUser.role === "admin" && targetUser.isActive) {
      const activeAdmins = await User.countDocuments({
        role: "admin",
        isActive: true,
      });

      if (activeAdmins <= 1) {
        res.status(400).json({
          success: false,
          message: "The last active admin cannot be deactivated.",
        });
        return;
      }
    }

    targetUser.isActive = isActive;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully.`,
      data: {
        user: {
          _id: targetUser._id,
          username: targetUser.username,
          email: targetUser.email,
          role: targetUser.role,
          isActive: targetUser.isActive,
        },
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update user status.",
    });
  }
};

// DELETE /api/admin/users/:id
export const deleteUserController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
      return;
    }

    if (req.user?.userId === id) {
      res.status(400).json({
        success: false,
        message: "You cannot delete your own account here.",
      });
      return;
    }

    const targetUser = await User.findById(id).select(
      "_id username role isActive",
    );

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    // protect the last active admin account.
    if (targetUser.role === "admin" && targetUser.isActive) {
      const activeAdmins = await User.countDocuments({
        role: "admin",
        isActive: true,
      });

      if (activeAdmins <= 1) {
        res.status(400).json({
          success: false,
          message: "The last active admin cannot be deleted.",
        });
        return;
      }
    }

    // remove records belonging to this user.
    await Promise.all([
      Transaction.deleteMany({ user: targetUser._id }),
      Budget.deleteMany({ user: targetUser._id }),
      SavingsGoal.deleteMany({ user: targetUser._id }),
    ]);

    await targetUser.deleteOne();

    res.status(200).json({
      success: true,
      message: "User and associated financial records deleted successfully.",
      data: {
        deletedUserId: id,
      },
    });
  } catch (error) {
    console.error("Delete user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete user.",
    });
  }
};
