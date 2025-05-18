import { Request, Response } from "express";
import axios from "axios";
import { PAYSTACK_SECRET_KEY } from "../config/paystack";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Setup Paystack API instance
const paystackAPI = axios.create({
          baseURL: "https://api.paystack.co",
          headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
          },
});

// Airtime purchase handler
export const purchaseAirtime = async (
          req: Request,
          res: Response
): Promise<any> => {
          const { phone, amount, network } = req.body;

          if (!phone || !amount || !network) {
                    return res.status(400).json({ error: "Missing required fields" });
          }

          const amountInKobo = amount * 100;
          const reference = `airtime_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

          try {
                    const response = await paystackAPI.post("/transaction/initialize", {
                              email: "airtime@customer.com",
                              amount: amountInKobo,
                              reference,
                              metadata: {
                                        custom_fields: [
                                                  {
                                                            display_name: "Phone Number",
                                                            variable_name: "phone_number",
                                                            value: phone,
                                                  },
                                                  {
                                                            display_name: "Network",
                                                            variable_name: "network",
                                                            value: network,
                                                  },
                                        ],
                              },
                    });

                    const { authorization_url } = response.data.data;

                    // ✅ Save AirtimeTransaction to DB
                    await prisma.airtimeTransaction.create({
                              data: {
                                        phone,
                                        amount,
                                        network,
                                        reference,
                              },
                    });

                    res.json({ authorizationUrl: authorization_url });
          } catch (error: any) {
                    console.error("Airtime Error:", error.response?.data || error.message);
                    res.status(500).json({ error: "Failed to initialize airtime purchase" });
          }
};
