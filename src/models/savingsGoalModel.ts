import mongoose, { Types } from "mongoose";

export type SavingsGoalStatus = "active" | "completed";

export interface ISavingsGoal {
  user: Types.ObjectId;
  name: string;
  description: string;
  targetAmount: number;
  savedAmount: number;
  deadline: Date | null;
  icon: string;
  color: string;
  status: SavingsGoalStatus;
}

const savingsGoalSchema = new mongoose.Schema<ISavingsGoal>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Goal name must be at least 2 characters."],
      maxlength: [60, "Goal name cannot exceed 60 characters."],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [250, "Description cannot exceed 250 characters."],
      default: "",
    },

    targetAmount: {
      type: Number,
      required: true,
      min: [0.01, "Target amount must be greater than zero."],
      validate: {
        validator: Number.isFinite,
        message: "Target amount must be a finite number.",
      },
    },

    savedAmount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Saved amount cannot be negative."],
      validate: {
        validator: Number.isFinite,
        message: "Saved amount must be a finite number.",
      },
    },

    deadline: {
      type: Date,
      default: null,
      validate: {
        validator: (value: Date | null) =>
          value === null || Number.isFinite(value.getTime()),
        message: "Please provide a valid deadline.",
      },
    },

    icon: {
      type: String,
      trim: true,
      default: "piggy-bank",
      maxlength: 50,
    },

    color: {
      type: String,
      trim: true,
      default: "amber",
      maxlength: 30,
    },

    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// efficiently retrieve a user's savings goals.
savingsGoalSchema.index({ user: 1, status: 1, createdAt: -1 });

const SavingsGoal = mongoose.model<ISavingsGoal>(
  "SavingsGoal",
  savingsGoalSchema,
);

export default SavingsGoal;
