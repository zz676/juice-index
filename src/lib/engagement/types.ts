import type { ReplyTone, EngagementReplyStatus } from "@prisma/client";

export type { ReplyTone, EngagementReplyStatus };

/** A tweet fetched from the X API. */
export interface FetchedTweet {
  id: string;
  text: string;
  url: string;
  quotedTweetText?: string;
  createdAt?: string; // ISO 8601 from X API created_at field
}

/** One entry from the X following list. */
export interface FollowingEntry {
  xUserId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Result from reply text generation. */
export interface GenerateReplyResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/** Result from image generation. */
export type GenerateImageResult =
  | { generated: true; imageBase64: string }
  | { generated: false; imageBase64: null };

/** MonitoredAccount joined with the owner's XAccount credentials. */
export interface MonitoredAccountWithCredentials {
  id: string;
  userId: string;
  xUserId: string;
  username: string;
  tone: ReplyTone;
  customTonePrompt: string | null;
  imageFrequency: number;
  lastSeenTweetId: string | null;
  xAccessToken: string;
  xRefreshToken: string;
  xTokenExpiresAt: Date;
}
