import axios from 'axios';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

const paystack = axios.create({
          baseURL: 'https://api.paystack.co',
          headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json',
          },
});

export default paystack;