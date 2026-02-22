import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Uploads a base64-encoded PNG image to the `engagement-images` Supabase Storage bucket.
 * Returns the public URL of the uploaded image.
 *
 * The bucket must be created in the Supabase dashboard with public read access.
 */
export async function uploadEngagementImage(
  replyId: string,
  imageBase64: string,
): Promise<string> {
  const supabase = getAdminClient();
  const buffer = Buffer.from(imageBase64, "base64");

  const { error } = await supabase.storage
    .from("engagement-images")
    .upload(`${replyId}.png`, buffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload engagement image: ${error.message}`);
  }

  const { data } = supabase.storage
    .from("engagement-images")
    .getPublicUrl(`${replyId}.png`);

  return data.publicUrl;
}
