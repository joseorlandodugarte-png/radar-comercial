CREATE TYPE "public"."data_source" AS ENUM('seed', 'osm', 'google_places', 'instagram_graph', 'manual', 'csv');--> statement-breakpoint
CREATE TYPE "public"."interaction_kind" AS ENUM('whatsapp', 'call', 'visit', 'instagram_dm', 'email', 'note');--> statement-breakpoint
CREATE TYPE "public"."lead_stage" AS ENUM('new', 'contacted', 'replied', 'meeting', 'proposal', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('instagram', 'facebook', 'tiktok');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('max', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."service" AS ENUM('social_setup', 'video', 'menu', 'billboard', 'flyer');--> statement-breakpoint
CREATE TYPE "public"."traffic_light" AS ENUM('green', 'yellow', 'red', 'no_social', 'unknown');--> statement-breakpoint
CREATE TABLE "business_tags" (
	"business_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "business_tags_business_id_tag_id_pk" PRIMARY KEY("business_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category_id" integer NOT NULL,
	"state_id" integer NOT NULL,
	"municipality_id" integer,
	"parish_id" integer,
	"sector" text,
	"address" text,
	"location" geometry(Point,4326),
	"on_main_road" boolean,
	"has_digital_menu" boolean,
	"phone" text,
	"whatsapp" text,
	"instagram" text,
	"facebook" text,
	"tiktok" text,
	"website" text,
	"source" "data_source" NOT NULL,
	"osm_id" text,
	"google_place_id" text,
	"ig_user_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"serves_food" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" "data_source" NOT NULL,
	"dry_run" boolean NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"kind" "interaction_kind" NOT NULL,
	"body" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_id" text
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"stage" "lead_stage" DEFAULT 'new' NOT NULL,
	"next_action_at" timestamp with time zone,
	"next_action_note" text,
	"lost_reason" text,
	"owner_id" text,
	"stage_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "manual_review_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"source" "data_source" NOT NULL,
	"reason" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "municipalities" (
	"id" serial PRIMARY KEY NOT NULL,
	"state_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"seat" text,
	"center" geometry(Point,4326),
	"boundary" geometry(MultiPolygon,4326)
);
--> statement-breakpoint
CREATE TABLE "parishes" (
	"id" serial PRIMARY KEY NOT NULL,
	"municipality_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"rating" real,
	"review_count" integer,
	"source" "data_source" NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"business_id" integer PRIMARY KEY NOT NULL,
	"digital_health" integer,
	"opportunity" integer,
	"traffic_light" "traffic_light" NOT NULL,
	"breakdown" jsonb NOT NULL,
	"config_version" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_needs" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"service" "service" NOT NULL,
	"priority" "priority" NOT NULL,
	"rule_id" text NOT NULL,
	"reason" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"platform" "social_platform" NOT NULL,
	"followers" integer,
	"posts_last_30d" integer,
	"reels_last_30d" integer,
	"last_post_at" timestamp with time zone,
	"engagement_rate" double precision,
	"uses_reels" boolean,
	"bio_complete" boolean,
	"has_link_in_bio" boolean,
	"mentions_promotions" boolean,
	"source" "data_source" NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"iso_code" text NOT NULL,
	"capital" text NOT NULL,
	CONSTRAINT "states_slug_unique" UNIQUE("slug"),
	CONSTRAINT "states_iso_code_unique" UNIQUE("iso_code")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "business_tags" ADD CONSTRAINT "business_tags_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_tags" ADD CONSTRAINT "business_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_parish_id_parishes_id_fk" FOREIGN KEY ("parish_id") REFERENCES "public"."parishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_review_queue" ADD CONSTRAINT "manual_review_queue_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "municipalities" ADD CONSTRAINT "municipalities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parishes" ADD CONSTRAINT "parishes_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_snapshots" ADD CONSTRAINT "review_snapshots_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_needs" ADD CONSTRAINT "service_needs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_snapshots" ADD CONSTRAINT "social_snapshots_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "businesses_location_gist" ON "businesses" USING gist ("location");--> statement-breakpoint
CREATE INDEX "businesses_municipality_idx" ON "businesses" USING btree ("municipality_id");--> statement-breakpoint
CREATE INDEX "businesses_category_idx" ON "businesses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "businesses_name_trgm" ON "businesses" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_osm_id_uq" ON "businesses" USING btree ("osm_id") WHERE "businesses"."osm_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_google_place_id_uq" ON "businesses" USING btree ("google_place_id") WHERE "businesses"."google_place_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_instagram_uq" ON "businesses" USING btree (lower("instagram")) WHERE "businesses"."instagram" is not null;--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "interactions_lead_idx" ON "interactions" USING btree ("lead_id","occurred_at");--> statement-breakpoint
CREATE INDEX "leads_stage_idx" ON "leads" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "manual_review_status_idx" ON "manual_review_queue" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "municipalities_state_slug_idx" ON "municipalities" USING btree ("state_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "parishes_municipality_slug_idx" ON "parishes" USING btree ("municipality_id","slug");--> statement-breakpoint
CREATE INDEX "review_snapshots_business_idx" ON "review_snapshots" USING btree ("business_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_needs_business_service_uq" ON "service_needs" USING btree ("business_id","service");--> statement-breakpoint
CREATE INDEX "social_snapshots_business_idx" ON "social_snapshots" USING btree ("business_id","platform","captured_at");