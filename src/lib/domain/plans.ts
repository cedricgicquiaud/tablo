export const PLAN_CODES = ["free", "pro", "enterprise"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const SUBSCRIPTION_STATUSES = ["active", "canceled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const EVENT_TYPES = ["signup", "login", "feature_use"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const PRICING_CENTS: Record<PlanCode, number> = {
  free: 0,
  pro: 2900,
  enterprise: 9900,
};

export const PLAN_DISTRIBUTION: ReadonlyArray<{ value: PlanCode; weight: number }> = [
  { value: "free", weight: 0.7 },
  { value: "pro", weight: 0.25 },
  { value: "enterprise", weight: 0.05 },
];
