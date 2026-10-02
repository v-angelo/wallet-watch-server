// imports
import "dotenv/config";

import express from "express";
import type { ErrorRequestHandler } from "express";
import cors from "cors";

import initDNS from "./config/dns-config.js";
import connectDB from "./config/db-config.js";

// initialization
const wwServer = express();
initDNS();

// middleware
wwServer.use(cors());
wwServer.use(express.json());

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
