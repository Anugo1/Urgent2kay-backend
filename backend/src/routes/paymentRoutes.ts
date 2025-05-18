import { Router } from "express";
import express from "express";
import { initializeTransaction } from "../controllers/acceptPayments";
import { purchaseAirtime } from "../controllers/airtime.controller";
import { initiateTransfer } from "../controllers/transfer.controller";
import { createSubaccount } from "../controllers/subaccount";
import paymentRoutes from '../routes/paymentRoutes';

const router = express.Router();

router.post("/accept-payment", initializeTransaction);
router.post("/airtime", purchaseAirtime);
router.post("/transfer", initiateTransfer);
router.post("/subaccount", createSubaccount); // This should be a POST route

export default router;