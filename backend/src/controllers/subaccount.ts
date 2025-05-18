//This is the controller i created for the accounts/ business service providers which will be receiving the money to be sent from paystack, in disbursement
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import paystack from "../utils/payment.util";

const prisma = new PrismaClient();

export const createSubaccount = async (req: Request, res: Response) => {
          const { business_name, bank_code, account_number, percentage_charge } = req.body;

          try {
                    const response = await paystack.post("/subaccount", {
                              business_name,
                              bank_code,
                              account_number,
                              percentage_charge,
                    });

                    const subaccount_code = response.data.data.subaccount_code;

                    await prisma.subaccount.create({
                              data: {
                                        businessName: business_name,
                                        bankCode: bank_code,
                                        accountNumber: account_number,
                                        percentageCharge: percentage_charge,
                                        subaccountCode: subaccount_code,
                              },
                    });

                    res.status(201).json({ message: "Subaccount created", subaccount_code });
          } catch (error: any) {
                    console.error("Subaccount Error:", error.response?.data || error.message);
                    res.status(500).json({ error: "Failed to create subaccount" });
          }
}; //I call this subaccount 