import mongoose, { Types } from "mongoose";

interface ITransaction {
  user: Types.ObjectId;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: Date;
  notes: string;
  paymentMethod: "cash" | "card" | "upi" | "bank transfer" | "other";
}

const transactionSchema = new mongoose.Schema<ITransaction>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    amount: {
      type: Number,
      required: true,
      min: [0.01, "Transaction amount must be greater than zero."],
    },

    type: {
      type: String,
      required: true,
      enum: ["income", "expense"],
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "bank transfer", "other"],
      default: "other",
    },
  },
  {
    timestamps: true,
  },
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
