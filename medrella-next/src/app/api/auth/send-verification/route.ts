import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";

import { db } from "@/db";
import { users, patients } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session?.userId) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 },
      );
    }

    const [profile] = await db
      .select({
        email: users.email,
        name: users.name,
        isVerified: patients.isVerified,
      })
      .from(users)
      .innerJoin(patients, eq(patients.userId, users.id))
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        { error: "Patient profile not found." },
        { status: 404 },
      );
    }

    if (profile.isVerified) {
      return NextResponse.json({
        message: "Your account is already verified.",
      });
    }

    const secret = process.env.EMAIL_VERIFICATION_SECRET;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!secret || !smtpUser || !smtpPass) {
      console.error("Missing email verification environment variables.");

      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 },
      );
    }

    const otp = randomInt(100000, 1000000).toString();

    const otpHash = createHash("sha256")
      .update(`${secret}:${session.userId}:${otp}`)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db
      .update(patients)
      .set({
        emailVerificationOtpHash: otpHash,
        emailVerificationOtpExpiresAt: expiresAt,
        emailVerificationOtpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(patients.userId, session.userId));

    try {
      await transporter.sendMail({
        from: {
          name: "Medrella",
          address: smtpUser,
        },
        to: profile.email,
        subject: "Your Medrella verification code",
        text: [
          `Hello ${profile.name},`,
          "",
          `Your Medrella verification code is: ${otp}`,
          "",
          "This code expires in 10 minutes.",
          "Do not share this code with anyone.",
          "",
          "If you did not request this code, you can ignore this email.",
        ].join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
            <h2>Verify your Medrella account</h2>
            <p>Hello ${escapeHtml(profile.name)},</p>
            <p>Use the following code to verify your email address:</p>
            <div style="padding: 20px; background: #f1f5f9; text-align: center; border-radius: 8px;">
              <h1 style="letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p>This code expires in <strong>10 minutes</strong>.</p>
            <p>Do not share this code with anyone.</p>
            <p>If you did not request this code, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      // Invalidate the OTP if Gmail fails to send the email.
      await db
        .update(patients)
        .set({
          emailVerificationOtpHash: null,
          emailVerificationOtpExpiresAt: null,
          emailVerificationOtpAttempts: 0,
          updatedAt: new Date(),
        })
        .where(eq(patients.userId, session.userId));

      console.error("Gmail SMTP email error:", emailError);

      return NextResponse.json(
        { error: "Unable to send OTP. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message: "Verification OTP sent to your registered email.",
    });
  } catch (error) {
    console.error("Send verification OTP error:", error);

    return NextResponse.json(
      { error: "Unable to send OTP. Please try again." },
      { status: 500 },
    );
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}