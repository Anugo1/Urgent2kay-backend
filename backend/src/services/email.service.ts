import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
import { EMAIL_USER, EMAIL_PASSWORD, EMAIL_HOST, EMAIL_PORT } from "../utils/env";
import { emailTemplate } from "../templates/emailTemplate";

export async function emailService(
          email: string,
          subject: string,
          // message: string

): Promise<void> {
          const transporter = nodemailer.createTransport({
                    host: EMAIL_HOST,
                    port: EMAIL_PORT,
                    secure: true,
                    auth: {
                              user: EMAIL_USER,
                              pass: EMAIL_PASSWORD,
                    },
          } as nodemailer.TransportOptions);

          //  verify connection configuration
          transporter.verify(function (error, success) {
                    if (error) {
                              console.log(error);
                    } else {
                              console.log("Server is ready to take our messages");
                    }
          });

          const mailOptions = {
                    from: EMAIL_USER,
                    to: email,
                    subject: subject,
                    html: emailTemplate

          };

          await transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                              console.log("Error sending email: ", error);
                    } else {
                              console.log("Email sent: " + info.response);
                              return info.response;
                    }
          });
}

// }

export default emailService
