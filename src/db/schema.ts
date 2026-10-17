import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { multiPolygon4326, point4326 } from "./geo-types";

/**
 * Data sources. Every business and every metric records where it came from.
 * - seed: demo data (never real), clearly labelled in the UI.
 * - osm: OpenStreetMap via Overpass API (ODbL).
 * - google_places: Google Places API (New), official.
 * - instagram_graph: Instagram Graph API Business Discovery, official.
 * - manual: typed by the user in the app.
 * - csv: imported from a CSV/Excel file.
 */
export const dataSourceEnum = pgEnum("data_source", [
  "seed",
  "osm",
  "google_places",
  "instagram_graph",
  "manual",
  "csv",
]);

export const platformEnum = pgEnum("social_platform", ["instagram", "facebook", "tiktok"]);

export const trafficLightEnum = pgEnum("traffic_light", [
  "green",
  "yellow",
  "red",
  "no_social",
  "unknown",
]);

export const serviceEnum = pgEnum("service", [
  "social_setup",
  "video",
  "menu",
  "billboard",
  "flyer",
]);

export const priorityEnum = pgEnum("priority", ["max", "high", "medium", "low"]);

export const leadStageEnum = pgEnum("lead_stage", [
  "new",
  "contacted",
  "replied",
  "meeting",
  "proposal",
  "won",
  "lost",
]);

export const interactionKindEnum = pgEnum("interaction_kind", [
  "whatsapp",
  "call",
  "visit",
  "instagram_dm",
  "email",
  "note",
]);

export const reviewStatusEnum = pgEnum("review_status", ["pending", "resolved", "dismissed"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  /** ISO 3166-2:VE code, e.g. VE-L for Mérida. */
  isoCode: text("iso_code").notNull().unique(),
  capital: text("capital").notNull(),
});

export const municipalities = pgTable(
  "municipalities",
  {
    id: serial("id").primaryKey(),
    stateId: integer("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    seat: text("seat"),
    /** Approximate centre (municipal seat) used only to centre the map. */
    center: point4326("center"),
    boundary: multiPolygon4326("boundary"),
  },
  (t) => [uniqueIndex("municipalities_state_slug_idx").on(t.stateId, t.slug)],
);

export const parishes = pgTable(
  "parishes",
  {
    id: serial("id").primaryKey(),
    municipalityId: integer("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (t) => [uniqueIndex("parishes_municipality_slug_idx").on(t.municipalityId, t.slug)],
);

// ---------------------------------------------------------------------------
// Categories (hierarchical)
// ---------------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    parentId: integer("parent_id").references((): AnyPgColumn => categories.id),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** lucide-react icon name. */
    icon: text("icon").notNull(),
    /** Restaurants, cafés and bars: eligible for the digital menu rule. */
    servesFood: boolean("serves_food").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("categories_parent_idx").on(t.parentId)],
);

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------

export const businesses = pgTable(
  "businesses",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    stateId: integer("state_id")
      .notNull()
      .references(() => states.id),
    municipalityId: integer("municipality_id").references(() => municipalities.id),
    parishId: integer("parish_id").references(() => parishes.id),
    sector: text("sector"),
    address: text("address"),
    location: point4326("location"),
    /** null = not known. Computed from OSM primary roads or set by hand. */
    onMainRoad: boolean("on_main_road"),
    /** null = not known. */
    hasDigitalMenu: boolean("has_digital_menu"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    instagram: text("instagram"),
    facebook: text("facebook"),
    tiktok: text("tiktok"),
    website: text("website"),
    source: dataSourceEnum("source").notNull(),
    osmId: text("osm_id"),
    googlePlaceId: text("google_place_id"),
    igUserId: text("ig_user_id"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("businesses_location_gist").using("gist", t.location),
    index("businesses_municipality_idx").on(t.municipalityId),
    index("businesses_category_idx").on(t.categoryId),
    index("businesses_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`),
    uniqueIndex("businesses_osm_id_uq")
      .on(t.osmId)
      .where(sql`${t.osmId} is not null`),
    uniqueIndex("businesses_google_place_id_uq")
      .on(t.googlePlaceId)
      .where(sql`${t.googlePlaceId} is not null`),
    uniqueIndex("businesses_instagram_uq")
      .on(sql`lower(${t.instagram})`)
      .where(sql`${t.instagram} is not null`),
  ],
);

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").notNull().default("gray"),
});

export const businessTags = pgTable(
  "business_tags",
  {
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.tagId] })],
);

// ---------------------------------------------------------------------------
// Measurements (append-only snapshots: never overwritten)
// ---------------------------------------------------------------------------

export const socialSnapshots = pgTable(
  "social_snapshots",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    followers: integer("followers"),
    postsLast30d: integer("posts_last_30d"),
    reelsLast30d: integer("reels_last_30d"),
    lastPostAt: timestamp("last_post_at", { withTimezone: true }),
    /** Average (likes + comments) / followers over recent posts, as a fraction (0.03 = 3 %). */
    engagementRate: doublePrecision("engagement_rate"),
    usesReels: boolean("uses_reels"),
    bioComplete: boolean("bio_complete"),
    hasLinkInBio: boolean("has_link_in_bio"),
    mentionsPromotions: boolean("mentions_promotions"),
    source: dataSourceEnum("source").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("social_snapshots_business_idx").on(t.businessId, t.platform, t.capturedAt)],
);

export const reviewSnapshots = pgTable(
  "review_snapshots",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    rating: real("rating"),
    reviewCount: integer("review_count"),
    source: dataSourceEnum("source").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("review_snapshots_business_idx").on(t.businessId, t.capturedAt)],
);

// ---------------------------------------------------------------------------
// Scores and suggested services (current values, recomputed from snapshots)
// ---------------------------------------------------------------------------

export const scores = pgTable("scores", {
  businessId: integer("business_id")
    .primaryKey()
    .references(() => businesses.id, { onDelete: "cascade" }),
  /** null when there is not enough data to compute it honestly. */
  digitalHealth: integer("digital_health"),
  opportunity: integer("opportunity"),
  trafficLight: trafficLightEnum("traffic_light").notNull(),
  /** Full explanation: every factor, its raw value, weight, contribution and source. */
  breakdown: jsonb("breakdown").notNull(),
  configVersion: text("config_version").notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceNeeds = pgTable(
  "service_needs",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    service: serviceEnum("service").notNull(),
    priority: priorityEnum("priority").notNull(),
    ruleId: text("rule_id").notNull(),
    reason: text("reason").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("service_needs_business_service_uq").on(t.businessId, t.service)],
);

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------

export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .unique()
      .references(() => businesses.id, { onDelete: "cascade" }),
    stage: leadStageEnum("stage").notNull().default("new"),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    nextActionNote: text("next_action_note"),
    lostReason: text("lost_reason"),
    /** Reserved for multi-user support. */
    ownerId: text("owner_id"),
    stageChangedAt: timestamp("stage_changed_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index("leads_stage_idx").on(t.stage)],
);

export const interactions = pgTable(
  "interactions",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    kind: interactionKindEnum("kind").notNull(),
    body: text("body"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    ownerId: text("owner_id"),
  },
  (t) => [index("interactions_lead_idx").on(t.leadId, t.occurredAt)],
);

// ---------------------------------------------------------------------------
// Ingestion bookkeeping
// ---------------------------------------------------------------------------

export const ingestionRuns = pgTable("ingestion_runs", {
  id: serial("id").primaryKey(),
  source: dataSourceEnum("source").notNull(),
  dryRun: boolean("dry_run").notNull(),
  params: jsonb("params").notNull().default({}),
  stats: jsonb("stats").notNull().default({}),
  status: text("status").notNull().default("running"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const manualReviewQueue = pgTable(
  "manual_review_queue",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    source: dataSourceEnum("source").notNull(),
    reason: text("reason").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: reviewStatusEnum("status").notNull().default("pending"),
    ...timestamps,
  },
  (t) => [index("manual_review_status_idx").on(t.status)],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const statesRelations = relations(states, ({ many }) => ({
  municipalities: many(municipalities),
}));

export const municipalitiesRelations = relations(municipalities, ({ one, many }) => ({
  state: one(states, { fields: [municipalities.stateId], references: [states.id] }),
  parishes: many(parishes),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  category: one(categories, { fields: [businesses.categoryId], references: [categories.id] }),
  state: one(states, { fields: [businesses.stateId], references: [states.id] }),
  municipality: one(municipalities, {
    fields: [businesses.municipalityId],
    references: [municipalities.id],
  }),
  score: one(scores, { fields: [businesses.id], references: [scores.businessId] }),
  lead: one(leads, { fields: [businesses.id], references: [leads.businessId] }),
  socialSnapshots: many(socialSnapshots),
  reviewSnapshots: many(reviewSnapshots),
  serviceNeeds: many(serviceNeeds),
  tags: many(businessTags),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  business: one(businesses, { fields: [leads.businessId], references: [businesses.id] }),
  interactions: many(interactions),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  lead: one(leads, { fields: [interactions.leadId], references: [leads.id] }),
}));

export const businessTagsRelations = relations(businessTags, ({ one }) => ({
  business: one(businesses, { fields: [businessTags.businessId], references: [businesses.id] }),
  tag: one(tags, { fields: [businessTags.tagId], references: [tags.id] }),
}));

export const serviceNeedsRelations = relations(serviceNeeds, ({ one }) => ({
  business: one(businesses, { fields: [serviceNeeds.businessId], references: [businesses.id] }),
}));

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type SocialSnapshot = typeof socialSnapshots.$inferSelect;
export type ReviewSnapshot = typeof reviewSnapshots.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadStage = (typeof leadStageEnum.enumValues)[number];
export type TrafficLight = (typeof trafficLightEnum.enumValues)[number];
export type Service = (typeof serviceEnum.enumValues)[number];
export type Priority = (typeof priorityEnum.enumValues)[number];
export type DataSource = (typeof dataSourceEnum.enumValues)[number];
export type InteractionKind = (typeof interactionKindEnum.enumValues)[number];
