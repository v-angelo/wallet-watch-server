// imports
import "dotenv/config";

import express from "express";
import type { ErrorRequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import initDNS from "./config/dns-config.js";
import connectDB from "./config/db-config.js";

import authRouter from "./routes/authRoutes.js";
import transactionRouter from "./routes/transactionRoutes.js";
import userRouter from "./routes/userRoutes.js";
import budgetRouter from "./routes/budgetRoutes.js";
import sgRouter from "./routes/savingsGoalRoutes.js";

// initialization
const wwServer = express();
initDNS();

// middlewares
wwServer.use(
  cors({
    origin: "http://localhost:4200",
    credentials: true,
  }),
);
wwServer.use(express.json());
wwServer.use(cookieParser());

// routes
wwServer.use("/api/auth", authRouter);
wwServer.use("/api/transactions", transactionRouter);
wwServer.use("/api/users", userRouter);
wwServer.use("/api/budgets", budgetRouter);
wwServer.use("/api/savings-goals", sgRouter);

// connect mongoDB
await connectDB();

// root route
wwServer.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "WalletWatch server is running!",
  });
});

// error handler
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: err instanceof Error ? err.message : "Internal Server Error!",
  });
};

wwServer.use(errorHandler);

// start server
const PORT = process.env.PORT || 3500;

wwServer.listen(PORT, () => {
  console.log(`WalletWatch server running on port ${PORT}`);
});
