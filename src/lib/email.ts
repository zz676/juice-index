import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing required env var: RESEND_API_KEY");
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Juice Index <noreply@juiceindex.io>";

export { resend, FROM };
