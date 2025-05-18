import axios from 'axios';

export const initiateBulkTransfer = async (payload: any) => {
          const response = await axios.post('https://api.paystack.co/transfer/bulk', payload, {
                    headers: {
                              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                              'Content-Type': 'application/json',
                    },
          });
          return response.data;
};
