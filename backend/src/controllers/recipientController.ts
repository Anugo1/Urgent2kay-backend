// controllers/recipientController.ts
import { Request, Response } from "express";
import { createRecipients } from "../services/recipientService";
import { RecipientInput } from "../services/recipientService";

export const bulkCreateRecipients = async (
          req: Request,
          res: Response
): Promise<any> => {
          try {
                    const recipients = req.body as RecipientInput[];

                    if (!Array.isArray(recipients)) {
                              return res
                                        .status(400)
                                        .json({ message: "Request body must be an array of recipients" });
                    }

                    const result = await createRecipients(recipients);

                    res.status(200).json({
                              message: "Recipients processed successfully",
                              data: result,
                    });
          } catch (error: any) {
                    console.error("❌ Error in /recipients:", error);
                    res.status(500).json({ message: error.message || "Internal Server Error" });
          }
};
