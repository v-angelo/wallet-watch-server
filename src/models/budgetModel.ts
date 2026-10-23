import mongoose, { Types } from "mongoose";

export type BudgetType = "overall" | "category";

export const budgetCategories = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Bills & Utilities",
  "Healthcare",
  "Other",
] as const;

export type BudgetCategory = (typeof budgetCategories)[number];

export interface IBudget {
  user: Types.ObjectId;
  type: BudgetType;
  category: string;
  amount: number;
  month: number;
  year: number;
}

const budgetSchema = new mongoose.Schema<IBudget>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["overall", "category"],
    },

    category: {
      type: String,
      trim: true,
      default: "",
      enum: ["", ...budgetCategories],
      required: function () {
        return this.type === "category";
      },
    },

    amount: {
      type: Number,
      required: true,
      min: [0.01, "Budget amount must be greater than zero."],
      validate: {
        validator: Number.isFinite,
        message: "Budget amount must be a finite number.",
      },
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      validate: {
        validator: Number.isInteger,
        message: "Month must be a whole number between 1 and 12.",
      },
    },

    year: {
      type: Number,
      required: true,
      min: 1000,
      max: 3000,
      validate: {
        validator: Number.isInteger,
        message: "Year must be a whole number.",
      },
    },
  },
  {
    timestamps: true,
  },
);

// prevent duplicate budgets for the same user, type, category, month, and year.
budgetSchema.index(
  { user: 1, type: 1, category: 1, month: 1, year: 1 },
  { unique: true },
);

// helps retrieve all budgets belonging to a user for a month.
budgetSchema.index({ user: 1, year: 1, month: 1 });

const Budget = mongoose.model<IBudget>("Budget", budgetSchema);

export default Budget;
