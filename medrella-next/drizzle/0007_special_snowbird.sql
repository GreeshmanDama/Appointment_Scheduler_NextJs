ALTER TABLE "patients" ADD COLUMN "email_verification_otp_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "email_verification_otp_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "email_verification_otp_attempts" integer DEFAULT 0 NOT NULL;