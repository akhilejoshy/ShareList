CREATE TABLE "bot_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reel_id" uuid NOT NULL,
	"type" text NOT NULL,
	"options" jsonb,
	"bot_message_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"ig_business_id" text NOT NULL,
	"metadata_source" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "bots_slug_unique" UNIQUE("slug"),
	CONSTRAINT "bots_ig_business_id_unique" UNIQUE("ig_business_id")
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reel_id" uuid NOT NULL,
	"source" text NOT NULL,
	"title_guess" text,
	"external_id" text,
	"confidence" numeric,
	"chosen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" uuid,
	"bot_id" uuid NOT NULL,
	"visited" boolean DEFAULT false NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ig_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bot_id" uuid NOT NULL,
	"ig_user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"cover_image_url" text,
	"banner_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"bot_id" uuid NOT NULL,
	"ig_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"refreshed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bot_id" uuid NOT NULL,
	"ig_media_id" text NOT NULL,
	"permalink" text,
	"caption" text,
	"location_tag" jsonb,
	"user_message" text,
	"thumbnail_url" text,
	"status" text DEFAULT 'received' NOT NULL,
	"entry_id" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_retry_at" timestamp with time zone,
	"shared_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bot_prompts" ADD CONSTRAINT "bot_prompts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_prompts" ADD CONSTRAINT "bot_prompts_reel_id_reels_id_fk" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_reel_id_reels_id_fk" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ig_links" ADD CONSTRAINT "ig_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ig_links" ADD CONSTRAINT "ig_links_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_tokens" ADD CONSTRAINT "link_tokens_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_tokens" ADD CONSTRAINT "meta_tokens_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reels" ADD CONSTRAINT "reels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reels" ADD CONSTRAINT "reels_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reels" ADD CONSTRAINT "reels_entry_id_collection_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."collection_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_entries_user_item_unique" ON "collection_entries" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ig_links_bot_ig_user_unique" ON "ig_links" USING btree ("bot_id","ig_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "items_bot_external_unique" ON "items" USING btree ("bot_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reels_user_ig_media_unique" ON "reels" USING btree ("user_id","ig_media_id");