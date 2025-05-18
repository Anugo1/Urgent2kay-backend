import { Request, Response } from "express";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { PrismaClient } from "@prisma/client";

// Replace with your actual secret key
const PAYSTACK_SECRET_KEY = "sk_test_xxx";

const prisma = new PrismaClient();

// Create Paystack API instance
const paystackAPI = axios.create({
          baseURL: "https://api.paystack.co",
          headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
          },
});

// ✅ ONE-ARGUMENT getBankCodeByName version
const getBankCodeByName = async (bank_name: string): Promise<string | null> => {
          try {
                    const response = await axios.get("https://api.paystack.co/bank?currency=NGN", {
                              headers: {
                                        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                              },
                    });

                    const banks = response.data.data;

                    const matchedBank = banks.find((bank: any) =>
                              bank.name.toLowerCase().includes(bank_name.toLowerCase())
                    );

                    return matchedBank ? matchedBank.code : null;
          } catch (err) {
                    console.error("Error fetching bank code:", err);
                    return null;
          }
};

// ✅ Transfer Controller using the one-arg function
export const initiateTransfer = async (req: Request, res: Response): Promise<any> => {
          const { name, account_number, bank_name, amount, reason } = req.body;

          if (!name || !account_number || !bank_name || !amount || !reason) {
                    return res.status(400).json({ error: "Missing required fields" });
          }

          try {
                    // Step 1: Get bank code using 1 argument
                    const bank_code = await getBankCodeByName(bank_name);
                    if (!bank_code) {
                              return res.status(400).json({ error: "Unsupported or invalid bank name" });
                    }

                    // Step 2: Create recipient
                    const recipientResponse = await paystackAPI.post("/transferrecipient", {
                              type: "nuban",
                              name,
                              account_number,
                              bank_code,
                              currency: "NGN",
                    });

                    const recipient_code = recipientResponse.data.data.recipient_code;

                    // Step 3: Make transfer
                    const reference = uuidv4();
                    const transferResponse = await paystackAPI.post("/transfer", {
                              source: "balance",
                              amount: Number(amount) * 100, // Convert to kobo
                              recipient: recipient_code,
                              reason,
                              reference,
                    });

                    const transferData = transferResponse.data.data;

                    // Step 4: Save to database
                    await prisma.transfer.create({
                              data: {
                                        name,
                                        accountNumber: account_number,
                                        bankName: bank_name,
                                        bankCode: bank_code,
                                        recipientCode: recipient_code,
                                        amount: parseFloat(amount),
                                        reason,
                                        reference,
                                        status: transferData.status || "pending",
                              },
                    });

                    res.status(200).json({ transfer: transferData });
          } catch (error: any) {
                    console.error("Transfer Error:", error.response?.data || error.message);
                    res.status(500).json({ error: "Transfer failed" });
          }
};
