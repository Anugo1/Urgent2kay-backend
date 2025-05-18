import dotenv from 'dotenv';
dotenv.config();

export const SMTP_CONFIG = {
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          secure: true, // true for 465, false for other ports
          auth: {
                    user: process.env.SMTP_USER || 'nzubeakpamgbo@gmail.com',
                    pass: process.env.SMTP_PASSWORD || 'YOUR_APP_PASSWORD',
          },
};