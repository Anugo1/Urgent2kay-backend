import { generateReference } from './../utils/generateReference';
import { PrismaClient, Transfer } from '@prisma/client';
import paystack from '../lib/paystack';

type TransferData = {
          amount: number;
          recipientCode: string;
          reason?: string;
};

type PaystackTransferObject = {
          amount: number;
          recipient: string;
          reason: string;
          reference: string;
};

const prisma = new PrismaClient();

const BATCH_LIMIT = 100;
const INTERVAL_MS = 5000;

// Fetch all pending transfers from the DB
export async function fetchTransferRecipients(): Promise<Transfer[]> {
          return await prisma.transfer.findMany({
                    where: { status: 'pending' },
                    take: 300, // adjustable
          });
}

// Create individual Paystack transfer object
export async function createTransferObject(transfer: TransferData): Promise<PaystackTransferObject> {
          return {
                    amount: Math.round(transfer.amount * 100), // Paystack uses kobo
                    recipient: transfer.recipientCode,
                    reason: transfer.reason || 'Payout',
                    reference: generateReference(),
          };
}

// Break transfers into batches for bulk transfer
export async function splitIntoBatches(
          transfers: PaystackTransferObject[],
          batchSize = BATCH_LIMIT
): Promise<PaystackTransferObject[][]> {
          const batches: PaystackTransferObject[][] = [];
          for (let i = 0; i < transfers.length; i += batchSize) {
                    batches.push(transfers.slice(i, i + batchSize));
          }
          return batches;
}

// Call Paystack bulk transfer endpoint
export async function initiateBatch(transfers: PaystackTransferObject[]): Promise<any> {
          try {
                    const payload = { transfers };
                    const response = await paystack.post('/transfer/bulk', payload);
                    return response.data;
          } catch (error) {
                    if (error instanceof Error) {
                              console.error('Error initiating transfer batch:', error.message, error);
                    } else {
                              console.error('Unknown error initiating transfer batch:', error);
                    }

                    return null;
          }
}