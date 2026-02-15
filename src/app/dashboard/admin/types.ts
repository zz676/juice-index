export interface RevenueMetrics {
  subscribersByTier: { tier: string; count: number }[];
  cancelPendingCount: number;
  newSubsThisMonth: number;
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
