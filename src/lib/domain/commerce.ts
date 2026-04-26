export const CATEGORIES = [
  "apparel",
  "home",
  "beauty",
  "tech",
  "accessories",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SEGMENTS = ["basic", "standard", "premium"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const ORDER_STATUSES = ["paid", "pending", "refunded", "canceled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PRODUCT_STATUSES = ["active", "draft", "sold_out"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const CHANNELS = ["online", "store"] as const;
export type Channel = (typeof CHANNELS)[number];

export const HUBS = ["paris", "lyon", "marseille", "bordeaux", "lille", "strasbourg"] as const;
export type Hub = (typeof HUBS)[number];

export const SHIPMENT_STATUSES = ["in_transit", "delivered", "returned"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const EVENT_TYPES = [
  "visit",
  "add_to_cart",
  "checkout",
  "paid",
  "login",
  "signup",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const CALENDAR_TAGS = ["campagne", "marketing", "stock", "email"] as const;
export type CalendarTag = (typeof CALENDAR_TAGS)[number];

export const COUNTRIES = ["FR", "US", "DE", "IT", "ES", "BE"] as const;
export type Country = (typeof COUNTRIES)[number];

export const PRICE_RANGES_CENTS: Record<Segment, [number, number]> = {
  basic: [500, 2900],
  standard: [3000, 7900],
  premium: [8000, 25000],
};
