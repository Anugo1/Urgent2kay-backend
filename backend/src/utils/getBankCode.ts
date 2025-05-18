import axios from "axios";
import { PAYSTACK_SECRET_KEY } from "../config/paystack";

export const getBankCodeByName = async (bankName: string): Promise<string | null> => {
          const response = await axios.get("https://api.paystack.co/bank", {
                    headers: {
                              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    },
          });

          const bank = response.data.data.find(
                    (b: any) => b.name.toLowerCase() === bankName.toLowerCase()
          );

          return bank ? bank.code : null;
};