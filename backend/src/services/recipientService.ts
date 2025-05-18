// src/services/recipientService.ts
import axios from 'axios';
import { PrismaClient, Transfer } from '@prisma/client';
import { generateReference } from '../utils/generateReference'; // Ensure this exists and returns a unique string

const prisma = new PrismaClient();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export interface RecipientInput {
          name: string;
          account_number: string;
          bank_code: string;
          currency: string;
}

export const createRecipients = async (recipients: RecipientInput[]): Promise<Transfer[]> => {
          const results: Transfer[] = [];

          for (const recipient of recipients) {
                    try {
                              const response = await axios.post(
                                        'https://api.paystack.co/transferrecipient',
                                        {
                                                  type: 'nuban',
                                                  name: recipient.name,
                                                  account_number: recipient.account_number,
                                                  bank_code: recipient.bank_code,
                                                  currency: recipient.currency,
                                        },
                                        {
                                                  headers: {
                                                            Authorization: `Bearer ${PAYSTACK_SECRET}`,
                                                            'Content-Type': 'application/json',
                                                  },
                                        }
                              );

                              const data = response.data.data;

                              const newReference = generateReference(); // ✅ Use unique reference for transaction

                              const saved = await prisma.transfer.create({
                                        data: {
                                                  name: recipient.name,
                                                  accountNumber: recipient.account_number,
                                                  bankCode: recipient.bank_code,
                                                  bankName: 'UNKNOWN', // You can optionally fetch real name from /bank endpoint
                                                  amount: 0,
                                                  reason: 'Initial creation',
                                                  reference: newReference,         // ✅ Unique transaction reference
                                                  recipientCode: data.recipient_code, // ✅ Paystack recipient code
                                                  status: 'pending',
                                        },
                              });

                              console.log(`✅ Created recipient: ${recipient.name} | Reference: ${newReference} | Recipient Code: ${data.recipient_code}`);

                              results.push(saved);
                    } catch (error: any) {
                              console.error(`❌ Failed to create recipient ${recipient.name}:`, error.response?.data || error.message);
                    }
          }

          return results;
};
