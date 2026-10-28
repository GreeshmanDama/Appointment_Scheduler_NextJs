import { NextRequest, NextResponse } from "next/server";
import {
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { patients } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session?.userId) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const otp = String(body.otp ?? "").trim();

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Enter a valid six-digit OTP." },
        { status: 400 },
      );
    }

    const [patient] = await db
      .select({
        id: patients.id,
        isVerified: patients.isVerified,
        otpHash: patients.emailVerificationOtpHash,
        expiresAt: patients.emailVerificationOtpExpiresAt,
        attempts: patients.emailVerificationOtpAttempts,
      })
      .from(patients)
      .where(eq(patients.userId, session.userId))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { error: "Patient profile not found." },
        { status: 404 },
      );
    }

    if (patient.isVerified) {
      return NextResponse.json({
        message: "Your account is already verified.",
      });
    }

    if (
      !patient.otpHash ||
      !patient.expiresAt ||
      patient.expiresAt.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 },
      );
    }

    if (patient.attempts >= 5) {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new OTP." },
        { status: 429 },
      );
    }

    const secret = process.env.EMAIL_VERIFICATION_SECRET;

    if (!secret) {
      throw new Error("EMAIL_VERIFICATION_SECRET is missing.");
    }

    const submittedHash = createHash("sha256")
      .update(`${secret}:${session.userId}:${otp}`)
      .digest("hex");

    const matches = timingSafeEqual(
      Buffer.from(patient.otpHash, "hex"),
      Buffer.from(submittedHash, "hex"),
    );

    if (!matches) {
      await db
        .update(patients)
        .set({
          emailVerificationOtpAttempts: patient.attempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(patients.id, patient.id));

      return NextResponse.json(
        { error: "Incorrect OTP. Please try again." },
        { status: 400 },
      );
    }

    await db
      .update(patients)
      .set({
        isVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationOtpHash: null,
        emailVerificationOtpExpiresAt: null,
        emailVerificationOtpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, patient.id));

    return NextResponse.json({
      message: "Your email has been verified successfully!",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return NextResponse.json(
      { error: "Unable to verify OTP. Please try again." },
      { status: 500 },
    );
  }
}