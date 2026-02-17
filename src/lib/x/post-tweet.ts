interface PostTweetResult {
  id: string;
  text: string;
}

export async function postTweet(
  accessToken: string,
  content: string,
  mediaIds?: string[]
): Promise<PostTweetResult> {
  const payload: Record<string, unknown> = { text: content };
  if (mediaIds && mediaIds.length > 0) {
    payload.media = { media_ids: mediaIds };
  }

  const res = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API error (${res.status}): ${body}`);
  }

  const json = await res.json();
  return { id: json.data.id, text: json.data.text };
}
