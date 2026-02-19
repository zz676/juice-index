import type { FetchedTweet, FollowingEntry } from "./types";

const X_API_BASE = "https://api.twitter.com/2";

async function xGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${X_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API error (${res.status}) ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

interface XTweetsResponse {
  data?: Array<{ id: string; text: string }>;
  meta?: { newest_id?: string };
}

interface XFollowingResponse {
  data?: Array<{
    id: string;
    username: string;
    name: string;
    profile_image_url?: string;
  }>;
  meta?: { next_token?: string };
}

interface XUserResponse {
  data?: {
    id: string;
    username: string;
    name: string;
    profile_image_url?: string;
  };
  errors?: Array<{ message: string }>;
}

/**
 * Fetches recent tweets from a user's timeline since a given tweet ID.
 * Excludes retweets and replies (original tweets only).
 */
export async function fetchRecentTweets(
  accessToken: string,
  xUserId: string,
  sinceId?: string | null,
): Promise<FetchedTweet[]> {
  const params = new URLSearchParams({
    max_results: "10",
    exclude: "retweets,replies",
    "tweet.fields": "id,text",
  });
  if (sinceId) {
    params.set("since_id", sinceId);
  }

  const data = await xGet<XTweetsResponse>(
    accessToken,
    `/users/${xUserId}/tweets?${params}`,
  );

  if (!data.data?.length) return [];

  return data.data.map((t) => ({
    id: t.id,
    text: t.text,
    url: `https://x.com/i/web/status/${t.id}`,
  }));
}

/**
 * Fetches one page of accounts the user is following.
 * Returns the entries and an optional pagination token for the next page.
 */
export async function fetchFollowingList(
  accessToken: string,
  xUserId: string,
  paginationToken?: string,
): Promise<{ entries: FollowingEntry[]; nextToken?: string }> {
  const params = new URLSearchParams({
    max_results: "1000",
    "user.fields": "id,username,name,profile_image_url",
  });
  if (paginationToken) {
    params.set("pagination_token", paginationToken);
  }

  const data = await xGet<XFollowingResponse>(
    accessToken,
    `/users/${xUserId}/following?${params}`,
  );

  const entries: FollowingEntry[] = (data.data ?? []).map((u) => ({
    xUserId: u.id,
    username: u.username,
    displayName: u.name,
    avatarUrl: u.profile_image_url ?? null,
  }));

  return { entries, nextToken: data.meta?.next_token };
}

/**
 * Looks up an X user by @handle for validation when adding a monitored account.
 * Returns null if the user is not found.
 */
export async function lookupUserByUsername(
  accessToken: string,
  username: string,
): Promise<FollowingEntry | null> {
  const params = new URLSearchParams({
    "user.fields": "id,username,name,profile_image_url",
  });

  const data = await xGet<XUserResponse>(
    accessToken,
    `/users/by/username/${encodeURIComponent(username)}?${params}`,
  );

  if (!data.data) return null;

  const u = data.data;
  return {
    xUserId: u.id,
    username: u.username,
    displayName: u.name,
    avatarUrl: u.profile_image_url ?? null,
  };
}
