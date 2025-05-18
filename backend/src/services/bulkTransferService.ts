import { PrismaClient, Transfer, BulkTransfer } from "@prisma/client";
import paystack from "../lib/paystack";
import { generateReference } from "../utils/generateReference";

const prisma = new PrismaClient();

interface PaystackTransfer {
          amount: number;
          recipient: string;
          reference: string;
          reason: string;
}

interface PaystackBulkTransferResponseData {
          amount: number;
          status: string;
          reference: string;
          reason: string;
          recipient: string;
          transfer_code: string;
          created_at: number;
}

export async function executeBulkTransfer(): Promise<{
          batchId: string;
          bulkTransfers: PaystackBulkTransferResponseData[];
}> {
          console.log("📦 Starting bulk transfer...");

          let transfers = await prisma.transfer.findMany({
                    where: {
                              status: { not: "success" },
                    },
          });

          console.log(`🔍 Found ${transfers.length} transfer(s) needing processing.`);

          if (transfers.length === 0) {
                    console.error("❌ No eligible transfers found.");
                    throw new Error("No eligible transfers found");
          }

          // Filter valid recipient codes
          transfers = transfers.filter(
                    (t) => t.recipientCode && t.recipientCode.startsWith("RCP_")
          );

          if (transfers.length === 0) {
                    console.error("❌ No valid transfers with Paystack recipient codes found.");
                    throw new Error("No valid transfers with Paystack recipient codes found");
          }

          // Assign missing references
          for (const t of transfers) {
                    if (!t.reference) {
                              const newRef = generateReference();
                              await prisma.transfer.update({
                                        where: { id: t.id },
                                        data: { reference: newRef },
                              });
                              t.reference = newRef;
                              console.log(`🆕 Reference generated for Transfer ID ${t.id}: ${newRef}`);
                    } else {
                              console.log(
                                        `✅ Transfer ID ${t.id} already has reference: ${t.reference}`
                              );
                    }
          }

          // Create batch
          const batch = await prisma.batch.create({
                    data: { status: "pending" },
          });

          console.log(`📦 Batch created with ID: ${batch.id}`);

          // Format for Paystack
          const paystackTransfers: PaystackTransfer[] = transfers.map((t) => ({
                    amount: 1000, // kobo
                    reference: t.reference!,
                    reason: t.reason || t.name || "Bulk transfer",
                    recipient: t.recipientCode,
          }));

          let bulkTransferResults: PaystackBulkTransferResponseData[];

          console.log(paystackTransfers);

          try {
                    console.log("📤 Sending bulk transfer to Paystack...");
                    const response = await paystack.post("/transfer/bulk", {
                              currency: "NGN",
                              source: "balance",
                              transfers: paystackTransfers,
                    });

                    if (!response.data.status) {
                              console.error("❌ Paystack error:", response.data.message);
                              throw new Error("Paystack API error: " + response.data.message);
                    }

                    bulkTransferResults = response.data.data;
                    console.log(
                              `✅ Paystack bulk transfer successful. Returned ${bulkTransferResults.length} records.`
                    );
          } catch (error: any) {
                    console.error(
                              "❌ Bulk transfer failed:",
                              error.response?.data || error.message
                    );
                    throw new Error("Failed to initiate Paystack bulk transfer");
          }

          // Save results and update transfers
          for (const result of bulkTransferResults) {
                    const transfer = transfers.find((t) => t.reference === result.reference);
                    if (!transfer) {
                              console.warn(
                                        `⚠️ No matching transfer found for reference: ${result.reference}`
                              );
                              continue;
                    }

                    const createdAt = result.created_at
                              ? new Date(result.created_at * 1000)
                              : new Date(); // fallback to current date

                    if (isNaN(createdAt.getTime())) {
                              throw new Error(`Invalid created_at timestamp: ${result.created_at}`);
                    }

                    console.log(result.reason);

                    await prisma.bulkTransfer.create({
                              data: {
                                        amount: result.amount,
                                        status: result.status,
                                        reference: result.reference,
                                        recipientCode: result.recipient,
                                        transferCode: result.transfer_code,
                                        batchId: batch.id,
                                        createdAt: createdAt,
                                        reason: "Because I can",
                              },
                    });

                    await prisma.transfer.update({
                              where: { id: transfer.id },
                              data: {
                                        status: result.status,
                                        batchId: batch.id,
                                        reference: result.reference,
                              },
                    });

                    console.log(`💾 Saved bulk transfer result for Transfer ID ${transfer.id}`);
          }

          // Finalize batch
          await prisma.batch.update({
                    where: { id: batch.id },
                    data: { status: "completed" },
          });

          console.log(`🎉 Batch ${batch.id} completed.`);

          return {
                    batchId: batch.id,
                    bulkTransfers: bulkTransferResults,
          };
}