-- Hard guarantee against double bookings: two active bookings of the same room
-- may never have overlapping occupied ranges (incl. preparation / cleaning buffers).
-- This holds even under concurrent transactions (enforced by the database itself).
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("room_id" WITH =, "occupied" WITH &&)
  WHERE ("status" IN ('requested', 'awaiting_payment', 'pending_payment', 'confirmed'));
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_time_order" CHECK ("ends_at" > "starts_at");
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_amounts_nonneg" CHECK ("total_amount" >= 0 AND "amount_paid" >= 0 AND "amount_refunded" >= 0 AND "amount_refunded" <= "amount_paid");
--> statement-breakpoint
ALTER TABLE "room_blocks" ADD CONSTRAINT "room_blocks_time_order" CHECK ("ends_at" > "starts_at");
--> statement-breakpoint
ALTER TABLE "room_opening_hours" ADD CONSTRAINT "room_opening_hours_valid" CHECK ("weekday" BETWEEN 1 AND 7 AND "start_minute" >= 0 AND "start_minute" < 1440 AND "end_minute" > "start_minute" AND "end_minute" <= 2880);
--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_redemptions" CHECK ("max_redemptions" IS NULL OR "redemption_count" <= "max_redemptions");
--> statement-breakpoint
CREATE INDEX "bookings_occupied_gist" ON "bookings" USING gist ("room_id", "occupied");
--> statement-breakpoint
CREATE INDEX "room_blocks_feed_uid_idx" ON "room_blocks" ("calendar_feed_id", "external_uid");
