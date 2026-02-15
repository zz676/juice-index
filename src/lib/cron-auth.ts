import { NextResponse, type NextRequest } from "next/server";

/**
 * Verifies cron endpoint authorization using two layers:
 * 1. CRON_SECRET bearer token (primary — required)
 * 2. x-vercel-cron-signature header (secondary — checked when present)
 *
 * Returns a NextResponse error if auth fails, or null if auth passes.
 */
export function verifyCronAuth(request: NextRequest): NextResponse | null {
  const secret = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", code: "UNAUTHORIZED", message: "Unauthorized" },
      { status: 401 },
    );
  }

  // Defense in depth: if Vercel sends its cron signature, verify it matches
  const vercelSig = request.headers.get("x-vercel-cron-signature");
  if (vercelSig && vercelSig !== process.env.CRON_SECRET) {
    console.warn("[CRON] x-vercel-cron-signature mismatch");
    return NextResponse.json(
      { error: "UNAUTHORIZED", code: "UNAUTHORIZED", message: "Unauthorized" },
      { status: 401 },
    );
  }

  return null;
}
