/**
 * Upload an image to X via the v2 Media Upload endpoint.
 *
 * The v1.1 media upload endpoint (upload.twitter.com) only supports OAuth 1.0a
 * and rejects OAuth 2.0 Bearer tokens entirely.  The v2 endpoint
 * (api.x.com/2/media/upload) accepts the user's OAuth 2.0 PKCE access token,
 * keeping upload and tweet-post under the same user credentials so X accepts
 * the returned media_id.
 *
 * v2 response shape: { data: { id: "...", media_key: "..." } }
 */

const UPLOAD_URL = "https://api.x.com/2/media/upload";

export function stripBase64Prefix(dataUrl: string): string {
  const match = dataUrl.match(/^data:[^;]+;base64,/);
  return match ? dataUrl.slice(match[0].length) : dataUrl;
}

function detectMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : "image/png";
}

export async function uploadMedia(
  accessToken: string,
  base64Data: string
): Promise<{ mediaId: string }> {
  const mimeType = detectMimeType(base64Data);
  const rawBase64 = stripBase64Prefix(base64Data);
  const buffer = Buffer.from(rawBase64, "base64");

  const blob = new Blob([buffer], { type: mimeType });
  const form = new FormData();
  form.append("media", blob, "chart.png");
  form.append("media_category", "tweet_image");

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X Media Upload error (${res.status}): ${body}`);
  }

  const json = await res.json();
  return { mediaId: json.data.id };
}
