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

export async function sendPaymentConfirmationEmail(opts: {
  to: string;
  name: string;
  tier: string;
  amountFormatted: string;
  periodEnd: Date;
}) {
  const { to, name, tier, amountFormatted, periodEnd } = opts;

  if (!to || !to.includes("@")) {
    throw new Error(`sendPaymentConfirmationEmail: invalid recipient address "${to}"`);
  }

  const safeName = escapeHtml(name.trim() || "there");
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  const renewDate = periodEnd.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h1 style="font-size:24px;margin-bottom:8px">Payment confirmed, ${safeName}!</h1>
      <p style="font-size:16px;line-height:1.6">
        Your <strong>Juice Index ${tierLabel}</strong> subscription is active.
        You were charged <strong>${amountFormatted}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:15px">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#555">Plan</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600">${tierLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#555">Amount</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600">${amountFormatted}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#555">Renews</td>
          <td style="padding:8px 0;font-weight:600">${renewDate}</td>
        </tr>
      </table>
      <a href="https://juiceindex.io/dashboard/billing"
         style="display:inline-block;padding:12px 24px;
                background:#6ada1b;color:#000;font-weight:600;
                border-radius:6px;text-decoration:none">
        View Billing
      </a>
      <p style="margin-top:32px;font-size:13px;color:#666">
        You can manage or cancel your subscription any time from your billing dashboard.
      </p>
    </div>
  `;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your Juice Index ${tierLabel} subscription is confirmed`,
    html,
  });
}
