import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import axios from "axios";
import { PAYSTACK_SECRET_KEY } from "../config/paystack";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const initializeTransaction = async (
          req: Request,
          res: Response
): Promise<any> => {
          const { email, amount, split_code } = req.body;

          if (!email || !amount || !split_code) {
                    return res.status(400).json({ error: "Missing fields are required" });
          }

          const amountInKobo = Number(amount) * 100;

          try {
                    const response = await axios.post(
                              "https://api.paystack.co/transaction/initialize",
                              { email, amount: amountInKobo.toString(), split_code },
                              {
                                        headers: {
                                                  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                                                  "Content-Type": "application/json",
                                        },
                              }
                    );

                    const { authorization_url, access_code, reference, status } = response.data.data;

                    await prisma.splitPayment.create({
                              data: {
                                        email,
                                        amount,
                                        splitCode: split_code,
                                        reference,
                                        status: "pending",
                              },
                    });

                    return res.json({ authorization_url, access_code, reference });
          } catch (error: any) {
                    console.error("Paystack error:", error.response?.data || error.message);
                    return res.status(500).json({ error: "Could not initialize payment" });
          }
};
