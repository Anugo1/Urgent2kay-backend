import express, { Request, Response } from "express";
import { executeBulkTransfer } from "../services/bulkTransferService";

const router = express.Router();

router.post("/bulk-transfer", async (req: Request, res: Response) => {
          try {
                    const result = await executeBulkTransfer();
                    res.status(200).json({
                              message: "Bulk transfer executed successfully",
                              batchId: result.batchId,
                              transfers: result.bulkTransfers,
                    });
          } catch (error: any) {
                    console.error("Bulk transfer error:", error);
                    res.status(500).json({ message: error.message || "Internal server error" });
          }
});

export default router;