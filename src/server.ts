// imports
import "dotenv/config";

import express from "express";
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

// start server
const PORT = process.env.PORT || 3500;

wwServer.listen(PORT, () => {
  console.log(`WalletWatch server running on port ${PORT}`);
});
