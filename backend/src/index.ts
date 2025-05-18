import express from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import session from "express-session";
import passport from "./services/passport";
import billRoutes from "./routes/bill.routes";
import sponsorshipRoutes from "./routes/sponsorship.routes";
import requestRoutes from "./routes/request.routes";
import providerRoutes from "./routes/provider.route";
import userRoutes from "./routes/user.routes";

import bodyParser from "body-parser";
import paystackRoutes from "./routes/paymentRoutes";
import { PORT } from "./config/paystack";
import { emailRouter } from "./routes/emailRoutes";
import { loggerMiddleware } from "./middlewares/emailLoggerMiddleware";
import { errorHandler } from "./middlewares/emailErrorMiddleware";
import paymentRoutes from "./routes/paymentRoutes";
import recipientRoutes from "./routes/recipientRoutes";
import { processBulkTransfers } from "./jobs/processBulkTransfers";
import bulkTransferRouter from "./routes/bulkTransferRouter";

// Blockchain routes
import blockchainRoutes from './routes/blockchain.routes';
import blockchainService from './services/blockchain.service';

const prisma = new PrismaClient();

dotenv.config();

const app = express();

// ✅ CORS config with dynamic origin checking
const allowedOrigins = [
  "http://localhost:8081",
  "https://web-dash-spark.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Setup session middleware BEFORE passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret", // put a real secret in .env
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

app.use(bodyParser.json());
app.use(express.json());
app.use(loggerMiddleware);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/sponsorships", sponsorshipRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api", providerRoutes);
app.use("/api/users", userRoutes);
app.use('/api/email', emailRouter);
app.use("/transaction", paystackRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api", recipientRoutes);
app.use("/api", bulkTransferRouter);

// Blockchain Routes
app.use("/blockchain", blockchainRoutes);

// Error Handling (should be last middleware)
app.use(errorHandler);

// Health check route
app.get("/", (_req, res) => {
  res.send("API is working 🚀");
});

// Set up periodic wallet balance synchronization (every hour)
function setupRecurringTasks() {
  // Initial sync after server start (wait 1 minute to ensure everything is running)
  setTimeout(async () => {
    try {
      console.log('Running initial wallet balance synchronization...');
      await blockchainService.syncWalletBalances();
    } catch (error) {
      console.error('Initial wallet balance sync failed:', error);
    }
  }, 60000); // 1 minute delay
  
  // Set up recurring sync every hour
  setInterval(async () => {
    try {
      console.log('Running scheduled wallet balance synchronization...');
      await blockchainService.syncWalletBalances();
    } catch (error) {
      console.error('Scheduled wallet balance sync failed:', error);
    }
  }, 3600000); // Every hour (3600000 ms)
}

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Connected to database ✅");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    
    // Start recurring tasks
    setupRecurringTasks();
    
  } catch (error) {
    console.error("Failed to connect to database ❌", error);
    process.exit(1); // Exit if database connection fails
  }
}

startServer();
// processBulkTransfers(); // Start the bulk transfer job
