import {
          fetchTransferRecipients,
          createTransferObject,
          splitIntoBatches,
          initiateBatch,
} from '../services/bulkTransfer.service';

export async function processBulkTransfers() {
          const recipients = await fetchTransferRecipients();

          if (recipients.length === 0) {
                    console.log('No pending recipients found.');
                    return;
          }

          const transferObjects = await Promise.all(
                    recipients.map((transfer) => createTransferObject(transfer))
          );

          const batches = await splitIntoBatches(transferObjects);

          for (let i = 0; i < batches.length; i++) {
                    const batch = batches[i];
                    console.log(`Processing batch ${i + 1} of ${batches.length}`);

                    const result = await initiateBatch(batch);

                    if (result && result.status) {
                              console.log(`Batch ${i + 1} submitted successfully.`);
                    }

                    // Wait 5 seconds before sending next batch
                    if (i < batches.length - 1) {
                              await new Promise((res) => setTimeout(res, 5000));
                    }
          }
}
