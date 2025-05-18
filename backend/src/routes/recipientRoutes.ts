import express from "express";
import { bulkCreateRecipients } from "../controllers/recipientController";

const router = express.Router();

router.post("/create-paystack-bulk-recipient", bulkCreateRecipients);

export default router;
