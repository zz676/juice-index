export interface DailyCount {
  date: string;
  count: number;
}

export interface RevenueMetrics {
  subscribersByTier: { tier: string; count: number }[];
  cancelPendingCount: number;
  newSubsThisMonth: number;
  dailySubTrend: DailyCount[];
}

export interface MRRData {
  mrr: number;
  arr: number;
}

export interface UserMetrics {
  totalUsers: number;
  newLast7d: number;
  newLast30d: number;
  activeUsersLast7d: number;
  usersByTier: { tier: string; count: number }[];
  dailySignupTrend: DailyCount[];
}

export interface AIModelUsage {
  model: string;
  requestCount: number;
  totalCost: number;
  successRate: number;
  inputTokens: number;
  outputTokens: number;
  avgLatencyMs: number;
}

export interface DailyCostTrend {
  date: string;
  cost: number;
}

export interface AIUsageMetrics {
  byModel: AIModelUsage[];
  dailyCostTrend: DailyCostTrend[];
}

export interface TopEndpoint {
  endpoint: string;
  method: string;
  count: number;
}

export interface APIActivityMetrics {
  requestsToday: number;
  requestsThisWeek: number;
  requestsThisMonth: number;
  avgResponseTimeMs: number;
  errorRate: number;
  topEndpoints: TopEndpoint[];
  requestsByTier: { tier: string; count: number }[];
  dailyRequestTrend: DailyCount[];
}

export interface WebhookHealthMetrics {
  totalEventsProcessed: number;
  eventsLast24h: number;
  eventsLast7d: number;
  lastProcessedAt: string | null;
  eventsByType: { eventType: string; count: number }[];
}

export interface AdminMetrics {
  revenue: RevenueMetrics;
  mrr: MRRData;
  users: UserMetrics;
  aiUsage: AIUsageMetrics;
  apiActivity: APIActivityMetrics;
  webhookHealth: WebhookHealthMetrics;
}

// ── Engagement admin types ─────────────────────────────────────────────────

export interface AdminEngagementUser {
  userId: string;
  name: string | null;
  email: string;
  totalReplies: number;
  postedReplies: number;
  failedReplies: number;
  successRate: number;
  totalCost: number;
  lastReplyDate: string | null;
}

export interface AdminEngagementSummary {
  totalReplies: number;
  totalCost: number;
  avgCostPerReply: number;
  activeUsers: number;
}

export interface AdminEngagementReply {
  id: string;
  sourceTweetId: string;
  sourceTweetText: string | null;
  sourceTweetUrl: string | null;
  replyText: string | null;
  replyTweetId: string | null;
  replyTweetUrl: string | null;
  replyImageUrl: string | null;
  tone: string;
  status: string;
  lastError: string | null;
  attempts: number;
  textGenerationCost: number;
  imageGenerationCost: number;
  apiCallCost: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  MonitoredAccount: { username: string; displayName: string | null; avatarUrl: string | null } | null;
}
