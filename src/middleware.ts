import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/* ------------------------------------------------------------------ */
/*  Security headers applied to every response                        */
/* ------------------------------------------------------------------ */

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.supabase.co https://pbs.twimg.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.upstash.io",
    "frame-src 'self' https://js.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/* ------------------------------------------------------------------ */
/*  CORS handling for public API routes (/api/v1/*)                   */
/* ------------------------------------------------------------------ */

function isPublicApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/v1/") || pathname === "/api/v1";
}

function handleCors(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const pathname = request.nextUrl.pathname;

  if (isPublicApiRoute(pathname)) {
    // Public API: allow any origin, but NO credentials (bearer-token only)
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Credentials", "false");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    response.headers.set(
      "Access-Control-Expose-Headers",
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
    );
    response.headers.set("Access-Control-Max-Age", "86400");
  } else if (pathname.startsWith("/api/")) {
    // Dashboard / billing / internal APIs: restrict to own origin
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    const origin = request.headers.get("origin");
    if (appUrl && origin && origin === appUrl) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
    }
  }

  return response;
}

/* ------------------------------------------------------------------ */
/*  Main middleware                                                    */
/* ------------------------------------------------------------------ */

export async function middleware(request: NextRequest) {
  // Handle CORS preflight requests immediately
  if (request.method === "OPTIONS") {
    const preflightResponse = new NextResponse(null, { status: 204 });
    handleCors(request, preflightResponse);
    applySecurityHeaders(preflightResponse);
    return preflightResponse;
  }

  const response = await updateSession(request);
  handleCors(request, response);
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
