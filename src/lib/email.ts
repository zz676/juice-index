import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing required env var: RESEND_API_KEY");
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Juice Index <noreply@juiceindex.io>";

export { resend, FROM };

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendWelcomeEmail(to: string, name: string) {
  if (!to || !to.includes("@")) {
    throw new Error(`sendWelcomeEmail: invalid recipient address "${to}"`);
  }
  const safeName = escapeHtml(name.trim() || "there");
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h1 style="font-size:24px;margin-bottom:8px">Welcome to Juice Index, ${safeName}!</h1>
      <p style="font-size:16px;line-height:1.6">
        You're all set. Head to your dashboard to start querying data, building charts,
        and sharing insights.
      </p>
      <a href="https://juiceindex.io/dashboard"
         style="display:inline-block;margin-top:16px;padding:12px 24px;
                background:#6ada1b;color:#000;font-weight:600;
                border-radius:6px;text-decoration:none">
        Go to Dashboard
      </a>
      <p style="margin-top:32px;font-size:13px;color:#666">
        Questions? Reply to this email — we read every one.
      </p>
    </div>
  `;

  return resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Juice Index!",
    html,
  });
}
