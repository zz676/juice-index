/**
 * Upload an image to X via the v1.1 Media Upload endpoint.
 *
 * upload.twitter.com requires OAuth 1.0a — it rejects OAuth 2.0 Bearer tokens.
 * We use the app-level OAuth 1.0a credentials (X_API_KEY, X_API_SECRET,
 * X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET) to authenticate the upload.
 * The resulting media_id can then be attached to a tweet posted with
 * the user's OAuth 2.0 token.
 */

import crypto from "crypto";

const UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";

export function stripBase64Prefix(dataUrl: string): string {
  const match = dataUrl.match(/^data:[^;]+;base64,/);
  return match ? dataUrl.slice(match[0].length) : dataUrl;
}

function detectMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : "image/png";
}

/* ------------------------------------------------------------------ */
/*  OAuth 1.0a signing                                                 */
/* ------------------------------------------------------------------ */

function getOAuth1Credentials() {
  const apiKey = process.env.X_API_KEY?.trim();
  const apiSecret = process.env.X_API_SECRET?.trim();
  const accessToken = process.env.X_ACCESS_TOKEN?.trim();
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET?.trim();
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error(
      "X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET must be configured for media upload"
    );
  }
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function generateOAuthHeader(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } =
    getOAuth1Credentials();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // Combine oauth params + request params for signature base
  const allParams = { ...oauthParams, ...params };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

/* ------------------------------------------------------------------ */
/*  Upload via multipart/form-data (OAuth 1.0a)                        */
/*  With multipart, NO body params are included in the OAuth signature */
/* ------------------------------------------------------------------ */

export async function uploadMedia(
  _accessToken: string,
  base64Data: string
): Promise<{ mediaId: string }> {
  const mimeType = detectMimeType(base64Data);
  const rawBase64 = stripBase64Prefix(base64Data);
  const buffer = Buffer.from(rawBase64, "base64");

  // With multipart/form-data, the OAuth signature includes only oauth_* params (no body params)
  const authHeader = generateOAuthHeader("POST", UPLOAD_URL, {});

  const blob = new Blob([buffer], { type: mimeType });
  const form = new FormData();
  form.append("media", blob, "chart.png");
  form.append("media_category", "tweet_image");

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X Media Upload error (${res.status}): ${body}`);
  }

  const json = await res.json();
  return { mediaId: json.media_id_string };
}
