import { NextResponse } from "next/server";
import { Webhook } from "svix";

export const runtime = "nodejs";

type ResendEmailEvent = {
  type:
    | "email.sent"
    | "email.delivered"
    | "email.delivery_delayed"
    | "email.complained"
    | "email.bounced"
    | "email.opened"
    | "email.clicked";
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    [key: string]: unknown;
  };
};

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const body = await request.text();

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "missing svix headers" }, { status: 400 });
  }

  let event: ResendEmailEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendEmailEvent;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resend-webhook] signature verification failed:", message);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  console.log(`[resend-webhook] ${event.type}`, {
    emailId: event.data.email_id,
    to: event.data.to,
    subject: event.data.subject,
    createdAt: event.created_at,
  });

  if (event.type === "email.bounced" || event.type === "email.complained") {
    console.warn(`[resend-webhook] ⚠️  ${event.type} for`, event.data.to);
  }

  return NextResponse.json({ received: true });
}
