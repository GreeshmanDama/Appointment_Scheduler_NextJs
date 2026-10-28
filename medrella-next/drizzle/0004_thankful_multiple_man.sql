DROP INDEX "users_is_active_idx";--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "doctors_is_active_idx" ON "doctors" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_active";