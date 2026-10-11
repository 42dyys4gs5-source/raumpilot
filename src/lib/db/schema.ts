import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Custom types                                                        */
/* ------------------------------------------------------------------ */

const citext = customType<{ data: string }>({ dataType: () => "citext" });

/** Postgres tstzrange, stored as "[start,end)" literal. Only written by the booking engine. */
const tstzrange = customType<{ data: string }>({ dataType: () => "tstzrange" });

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();

/* ------------------------------------------------------------------ */
/* Users & authentication                                              */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: citext("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  emailVerifiedAt: ts("email_verified_at"),
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  /** AES-256-GCM encrypted TOTP secret (see lib/security/crypto). */
  totpSecretEnc: text("totp_secret_enc"),
  totpEnabledAt: ts("totp_enabled_at"),
  locale: text("locale").notNull().default("de"),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: ts("locked_until"),
  lastLoginAt: ts("last_login_at"),
  disabledAt: ts("disabled_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token. The raw token only lives in the cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeOrgId: uuid("active_org_id"),
    mfaVerifiedAt: ts("mfa_verified_at"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    expiresAt: ts("expires_at").notNull(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["email_verify", "password_reset", "invite"] }).notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [index("auth_tokens_user_idx").on(t.userId, t.type)],
);

/* ------------------------------------------------------------------ */
/* Tenancy                                                             */
/* ------------------------------------------------------------------ */

export type NotificationSettings = {
  notifyNewBooking: boolean;
  notifyCancellation: boolean;
  customerReminders: boolean;
  reminderHoursBefore: number;
  notificationEmail: string | null;
};

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    legalName: text("legal_name"),
    contactEmail: citext("contact_email").notNull(),
    phone: text("phone"),
    website: text("website"),
    street: text("street"),
    postalCode: text("postal_code"),
    city: text("city"),
    country: text("country").notNull().default("CH"),
    vatNumber: text("vat_number"),
    vatRegistered: boolean("vat_registered").notNull().default(false),
    /** VAT rate in basis points, e.g. 810 = 8.1 %. */
    vatRateBp: integer("vat_rate_bp").notNull().default(810),
    timezone: text("timezone").notNull().default("Europe/Zurich"),
    logoPath: text("logo_path"),
    brandColor: text("brand_color"),
    about: text("about"),
    planKey: text("plan_key"),
    subscriptionStatus: text("subscription_status").notNull().default("none"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    stripeAccountId: text("stripe_account_id").unique(),
    stripeChargesEnabled: boolean("stripe_charges_enabled").notNull().default(false),
    stripePayoutsEnabled: boolean("stripe_payouts_enabled").notNull().default(false),
    stripeDetailsSubmitted: boolean("stripe_details_submitted").notNull().default(false),
    directoryOptIn: boolean("directory_opt_in").notNull().default(false),
    notificationSettings: jsonb("notification_settings")
      .$type<NotificationSettings>()
      .notNull()
      .default({
        notifyNewBooking: true,
        notifyCancellation: true,
        customerReminders: true,
        reminderHoursBefore: 24,
        notificationEmail: null,
      }),
    onboardingCompletedAt: ts("onboarding_completed_at"),
    suspendedAt: ts("suspended_at"),
    suspendedReason: text("suspended_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("organizations_directory_idx").on(t.directoryOptIn)],
);

export const memberships = pgTable(
  "memberships",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "staff"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] }), index("memberships_user_idx").on(t.userId)],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: citext("email").notNull(),
    role: text("role", { enum: ["admin", "staff"] }).notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: ts("expires_at").notNull(),
    acceptedAt: ts("accepted_at"),
    createdAt: createdAt(),
  },
  (t) => [index("invitations_org_idx").on(t.orgId)],
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    street: text("street"),
    postalCode: text("postal_code"),
    city: text("city"),
    country: text("country").notNull().default("CH"),
    createdAt: createdAt(),
  },
  (t) => [index("locations_org_idx").on(t.orgId)],
);

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

export const ROOM_CATEGORIES = [
  "eventraum",
  "partyraum",
  "sitzungszimmer",
  "seminarraum",
  "fotostudio",
  "proberaum",
  "tanzstudio",
  "yogastudio",
  "gemeinschaftsraum",
  "atelier",
  "andere",
] as const;
export type RoomCategory = (typeof ROOM_CATEGORIES)[number];

export type CancellationPolicy = {
  /** Full refund if cancelled at least this many hours before start. */
  freeUntilHours: number;
  /** Partial refund percentage (0-100) if cancelled at least partialUntilHours before start. */
  partialRefundPercent: number;
  partialUntilHours: number;
};

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    category: text("category", { enum: ROOM_CATEGORIES }).notNull().default("eventraum"),
    shortDescription: text("short_description"),
    description: text("description"),
    street: text("street"),
    postalCode: text("postal_code"),
    city: text("city"),
    country: text("country").notNull().default("CH"),
    capacity: integer("capacity").notNull().default(10),
    sizeSqm: integer("size_sqm"),
    amenities: text("amenities").array().notNull().default(sql`'{}'::text[]`),
    rentalTerms: text("rental_terms"),
    houseRules: text("house_rules"),
    currency: text("currency").notNull().default("CHF"),
    /** All prices in Rappen (1/100 CHF). */
    hourlyPrice: integer("hourly_price"),
    halfDayPrice: integer("half_day_price"),
    halfDayHours: integer("half_day_hours").notNull().default(5),
    dayPrice: integer("day_price"),
    dayHours: integer("day_hours").notNull().default(12),
    minDurationMinutes: integer("min_duration_minutes").notNull().default(60),
    maxDurationMinutes: integer("max_duration_minutes").notNull().default(720),
    slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(30),
    leadTimeMinutes: integer("lead_time_minutes").notNull().default(120),
    maxAdvanceDays: integer("max_advance_days").notNull().default(365),
    bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
    bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
    bookingMode: text("booking_mode", { enum: ["instant", "request"] }).notNull().default("instant"),
    paymentMode: text("payment_mode", { enum: ["online", "offline"] }).notNull().default("offline"),
    offlinePaymentNote: text("offline_payment_note"),
    requestExpiryHours: integer("request_expiry_hours").notNull().default(48),
    cancellationPolicy: jsonb("cancellation_policy")
      .$type<CancellationPolicy>()
      .notNull()
      .default({ freeUntilHours: 72, partialRefundPercent: 50, partialUntilHours: 24 }),
    depositAmount: integer("deposit_amount").notNull().default(0),
    depositMode: text("deposit_mode", { enum: ["none", "on_site", "online"] }).notNull().default("none"),
    status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
    timezone: text("timezone").notNull().default("Europe/Zurich"),
    icalToken: text("ical_token").notNull().unique(),
    publishedAt: ts("published_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("rooms_org_idx").on(t.orgId), index("rooms_status_idx").on(t.status, t.category)],
);

export const roomOpeningHours = pgTable(
  "room_opening_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    /** ISO weekday 1 = Monday … 7 = Sunday */
    weekday: smallint("weekday").notNull(),
    /** Minutes since local midnight. endMinute may exceed 1440 for windows running past midnight. */
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
  },
  (t) => [index("room_opening_hours_room_idx").on(t.roomId)],
);

export const roomPhotos = pgTable(
  "room_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    thumbPath: text("thumb_path").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    alt: text("alt"),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("room_photos_room_idx").on(t.roomId, t.sort)],
);

export const calendarFeeds = pgTable(
  "calendar_feeds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Encrypted, because private iCal URLs contain secrets. */
    urlEnc: text("url_enc").notNull(),
    active: boolean("active").notNull().default(true),
    lastSyncedAt: ts("last_synced_at"),
    lastError: text("last_error"),
    lastEventCount: integer("last_event_count"),
    createdAt: createdAt(),
  },
  (t) => [index("calendar_feeds_room_idx").on(t.roomId)],
);

export const roomBlocks = pgTable(
  "room_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** null = applies to all rooms of the organisation (e.g. holidays). */
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    reason: text("reason"),
    source: text("source", { enum: ["manual", "holiday", "ical"] }).notNull().default("manual"),
    calendarFeedId: uuid("calendar_feed_id").references(() => calendarFeeds.id, { onDelete: "cascade" }),
    externalUid: text("external_uid"),
    createdAt: createdAt(),
  },
  (t) => [index("room_blocks_lookup_idx").on(t.orgId, t.roomId, t.startsAt)],
);

export const priceRules = pgTable(
  "price_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    weekdays: smallint("weekdays").array(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    startMinute: integer("start_minute"),
    endMinute: integer("end_minute"),
    adjustmentPercent: integer("adjustment_percent").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("price_rules_org_idx").on(t.orgId)],
);

export const extras = pgTable(
  "extras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price").notNull(),
    pricing: text("pricing", { enum: ["per_booking", "per_hour", "per_person", "per_unit"] })
      .notNull()
      .default("per_booking"),
    maxQuantity: integer("max_quantity").notNull().default(1),
    /** null = available for all rooms */
    roomIds: uuid("room_ids").array(),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("extras_org_idx").on(t.orgId)],
);

export const discountCodes = pgTable(
  "discount_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    code: citext("code").notNull(),
    kind: text("kind", { enum: ["percent", "fixed"] }).notNull(),
    /** percent: 1-100, fixed: Rappen */
    value: integer("value").notNull(),
    validFrom: ts("valid_from"),
    validUntil: ts("valid_until"),
    maxRedemptions: integer("max_redemptions"),
    redemptionCount: integer("redemption_count").notNull().default(0),
    minAmount: integer("min_amount"),
    roomIds: uuid("room_ids").array(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("discount_codes_org_code_idx").on(t.orgId, t.code)],
);

/* ------------------------------------------------------------------ */
/* Customers & bookings                                                */
/* ------------------------------------------------------------------ */

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: citext("email").notNull(),
    phone: text("phone"),
    company: text("company"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("customers_org_email_idx").on(t.orgId, t.email)],
);

export const BOOKING_STATUSES = [
  "requested",
  "awaiting_payment",
  "pending_payment",
  "confirmed",
  "cancelled",
  "declined",
  "expired",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
/** Statuses that occupy the room (enforced by the exclusion constraint). */
export const BLOCKING_STATUSES: BookingStatus[] = ["requested", "awaiting_payment", "pending_payment", "confirmed"];

export const PAYMENT_STATUSES = [
  "none",
  "pending",
  "paid",
  "partially_refunded",
  "refunded",
  "failed",
  "offline_due",
  "offline_paid",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type PriceBreakdown = {
  lines: { label: string; amount: number; kind: "rent" | "adjustment" | "extra" | "discount" | "deposit" }[];
  rentAmount: number;
  extrasAmount: number;
  discountAmount: number;
  depositAmount: number;
  totalAmount: number;
  vatAmount: number;
  vatRateBp: number;
  pricesIncludeVat: boolean;
  durationMinutes: number;
};

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    reference: text("reference").notNull().unique(),
    status: text("status", { enum: BOOKING_STATUSES }).notNull(),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
    bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
    /** [starts_at - buffer_before, ends_at + buffer_after) – protected by an exclusion constraint. */
    occupied: tstzrange("occupied").notNull(),
    guests: integer("guests").notNull().default(1),
    customerName: text("customer_name").notNull(),
    customerEmail: citext("customer_email").notNull(),
    customerPhone: text("customer_phone"),
    customerCompany: text("customer_company"),
    customerMessage: text("customer_message"),
    internalNote: text("internal_note"),
    source: text("source", { enum: ["online", "widget", "manual"] }).notNull().default("online"),
    paymentMode: text("payment_mode", { enum: ["online", "offline", "none"] }).notNull(),
    paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES }).notNull().default("none"),
    currency: text("currency").notNull().default("CHF"),
    totalAmount: integer("total_amount").notNull().default(0),
    depositAmount: integer("deposit_amount").notNull().default(0),
    amountPaid: integer("amount_paid").notNull().default(0),
    amountRefunded: integer("amount_refunded").notNull().default(0),
    priceBreakdown: jsonb("price_breakdown").$type<PriceBreakdown>().notNull(),
    discountCodeId: uuid("discount_code_id").references(() => discountCodes.id, { onDelete: "set null" }),
    holdExpiresAt: ts("hold_expires_at"),
    requestExpiresAt: ts("request_expires_at"),
    paymentDueAt: ts("payment_due_at"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    confirmedAt: ts("confirmed_at"),
    cancelledAt: ts("cancelled_at"),
    cancelledBy: text("cancelled_by", { enum: ["customer", "landlord", "system"] }),
    cancellationReason: text("cancellation_reason"),
    reminderSentAt: ts("reminder_sent_at"),
    calendarConflict: boolean("calendar_conflict").notNull().default(false),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("bookings_org_starts_idx").on(t.orgId, t.startsAt),
    index("bookings_room_starts_idx").on(t.roomId, t.startsAt),
    index("bookings_status_idx").on(t.status),
    index("bookings_customer_idx").on(t.customerId),
  ],
);

export const bookingExtras = pgTable(
  "booking_extras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    extraId: uuid("extra_id").references(() => extras.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    pricing: text("pricing").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    total: integer("total").notNull(),
  },
  (t) => [index("booking_extras_booking_idx").on(t.bookingId)],
);

export const bookingEvents = pgTable(
  "booking_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    actor: text("actor").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("booking_events_booking_idx").on(t.bookingId, t.createdAt)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    kind: text("kind", { enum: ["charge", "refund", "offline"] }).notNull(),
    status: text("status", { enum: ["succeeded", "pending", "failed"] }).notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("CHF"),
    method: text("method"),
    /** Stripe object id (pi_, re_) – unique per kind to keep webhook processing idempotent. */
    externalId: text("external_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("payments_org_idx").on(t.orgId, t.createdAt),
    uniqueIndex("payments_external_idx").on(t.kind, t.externalId),
  ],
);

/* ------------------------------------------------------------------ */
/* SaaS billing                                                        */
/* ------------------------------------------------------------------ */

export type PlanFeatures = {
  extras: boolean;
  discountCodes: boolean;
  priceRules: boolean;
  statistics: boolean;
  advancedStatistics: boolean;
  reminders: boolean;
  team: boolean;
  branding: boolean;
  prioritySupport: boolean;
  calendarImport: boolean;
};

export const plans = pgTable("plans", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  priceMonthly: integer("price_monthly").notNull(),
  currency: text("currency").notNull().default("CHF"),
  stripePriceId: text("stripe_price_id"),
  maxRooms: integer("max_rooms").notNull(),
  maxLocations: integer("max_locations").notNull(),
  maxMembers: integer("max_members").notNull(),
  features: jsonb("features").$type<PlanFeatures>().notNull(),
  highlights: text("highlights").array().notNull().default(sql`'{}'::text[]`),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  updatedAt: updatedAt(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    source: text("source", { enum: ["stripe", "manual"] }).notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    planKey: text("plan_key").notNull(),
    status: text("status").notNull(),
    amountMonthly: integer("amount_monthly").notNull().default(0),
    currentPeriodEnd: ts("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: ts("canceled_at"),
    trialEnd: ts("trial_end"),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("subscriptions_org_idx").on(t.orgId), index("subscriptions_status_idx").on(t.status)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    stripeInvoiceId: text("stripe_invoice_id").notNull().unique(),
    number: text("number"),
    status: text("status").notNull(),
    amountDue: integer("amount_due").notNull(),
    amountPaid: integer("amount_paid").notNull(),
    currency: text("currency").notNull(),
    hostedInvoiceUrl: text("hosted_invoice_url"),
    invoicePdf: text("invoice_pdf"),
    periodStart: ts("period_start"),
    periodEnd: ts("period_end"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("invoices_org_idx").on(t.orgId, t.createdAt)],
);

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  account: text("account"),
  receivedAt: ts("received_at").notNull().defaultNow(),
  lockedAt: ts("locked_at"),
  processedAt: ts("processed_at"),
  error: text("error"),
});

/* ------------------------------------------------------------------ */
/* Infrastructure: jobs, email, logs, rate limits, settings, support    */
/* ------------------------------------------------------------------ */

export const jobs = pgTable(
  "jobs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status", { enum: ["pending", "running", "done", "failed"] }).notNull().default("pending"),
    runAt: ts("run_at").notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(6),
    lockedAt: ts("locked_at"),
    lastError: text("last_error"),
    /** Prevents duplicate critical jobs (e.g. confirmation mail per booking). */
    dedupeKey: text("dedupe_key").unique(),
    createdAt: createdAt(),
    completedAt: ts("completed_at"),
  },
  (t) => [index("jobs_due_idx").on(t.status, t.runAt)],
);

export const emailLog = pgTable(
  "email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    template: text("template").notNull(),
    status: text("status", { enum: ["sent", "failed", "logged"] }).notNull(),
    providerId: text("provider_id"),
    error: text("error"),
    orgId: uuid("org_id"),
    bookingId: uuid("booking_id"),
    /** Plain-text body – only stored in EMAIL_MODE=log (development/tests), never in production. */
    debugBody: text("debug_body"),
    createdAt: createdAt(),
  },
  (t) => [index("email_log_created_idx").on(t.createdAt)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    orgId: uuid("org_id"),
    action: text("action").notNull(),
    severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull().default("info"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt), index("audit_log_org_idx").on(t.orgId)],
);

export const errorLog = pgTable(
  "error_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    context: jsonb("context").$type<Record<string, unknown>>(),
    resolvedAt: ts("resolved_at"),
    createdAt: createdAt(),
  },
  (t) => [index("error_log_created_idx").on(t.createdAt)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: ts("window_start").notNull(),
  count: integer("count").notNull(),
});

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export const systemChecks = pgTable("system_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  ok: boolean("ok").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    category: text("category", { enum: ["support", "sales", "billing", "privacy"] }).notNull().default("support"),
    name: text("name").notNull(),
    email: citext("email").notNull(),
    subject: text("subject").notNull(),
    status: text("status", { enum: ["open", "answered", "closed"] }).notNull().default("open"),
    priority: text("priority", { enum: ["normal", "high"] }).notNull().default("normal"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("support_tickets_status_idx").on(t.status, t.createdAt)],
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    author: text("author", { enum: ["customer", "admin"] }).notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("support_messages_ticket_idx").on(t.ticketId, t.createdAt)],
);
