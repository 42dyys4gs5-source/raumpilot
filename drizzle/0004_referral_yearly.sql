ALTER TABLE "organizations" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "referred_by_org_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "referral_rewarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "stripe_price_id_yearly" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_interval" text DEFAULT 'month' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_referred_by_org_id_organizations_id_fk" FOREIGN KEY ("referred_by_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_referral_code_unique" UNIQUE("referral_code");