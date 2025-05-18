import dotenv from "dotenv";
dotenv.config();

export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
export const PORT = process.env.PORT || "5000";
