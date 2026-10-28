
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users, patients } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isUniqueConstraintError(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    return (error as { code?: string }).code === "23505";
  }

  return false;
}

// GET /api/patient/profile
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session?.userId) {
      return errorResponse("Unauthorized. Please log in.", 401);
    }

    const [profile] = await db
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone,
        emergencyContactName: patients.emergencyContactName,
        emergencyContactPhone: patients.emergencyContactPhone,
        isVerified: patients.isVerified,
      })
      .from(patients)
      .innerJoin(users, eq(patients.userId, users.id))
      .where(eq(patients.userId, session.userId))
      .limit(1);

    if (!profile) {
      return errorResponse("Patient profile not found.", 404);
    }

    return NextResponse.json({ patient: profile });
  } catch (error) {
    console.error("Get patient profile error:", error);

    return errorResponse(
      "Failed to retrieve patient profile.",
      500,
    );
  }
}

// PATCH /api/patient/profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session?.userId) {
      return errorResponse("Unauthorized. Please log in.", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON request body.", 400);
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return errorResponse("Invalid request body.", 400);
    }

    const data = body as Record<string, unknown>;

    const name =
      typeof data.name === "string" ? data.name.trim() : "";

    const email =
      typeof data.email === "string"
        ? data.email.trim().toLowerCase()
        : "";

    const phone =
      typeof data.phone === "string" ? data.phone.trim() : "";

    const emergencyContactName =
      typeof data.emergencyContactName === "string"
        ? data.emergencyContactName.trim()
        : "";

    const emergencyContactPhone =
      typeof data.emergencyContactPhone === "string"
        ? data.emergencyContactPhone.trim()
        : "";

    if (!name) {
      return errorResponse("Full name is required.", 400);
    }

    if (name.length > 120) {
      return errorResponse(
        "Full name cannot exceed 120 characters.",
        400,
      );
    }

    if (!email || !isValidEmail(email)) {
      return errorResponse(
        "Please provide a valid email address.",
        400,
      );
    }

    if (email.length > 255) {
      return errorResponse(
        "Email address cannot exceed 255 characters.",
        400,
      );
    }

    if (phone.length > 20) {
      return errorResponse(
        "Phone number cannot exceed 20 characters.",
        400,
      );
    }

    if (emergencyContactName.length > 120) {
      return errorResponse(
        "Emergency contact name cannot exceed 120 characters.",
        400,
      );
    }

    if (emergencyContactPhone.length > 20) {
      return errorResponse(
        "Emergency contact phone cannot exceed 20 characters.",
        400,
      );
    }

    const updatedProfile = await db.transaction(async (tx) => {
      const [currentUser] = await tx
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!currentUser) {
        throw new Error("USER_NOT_FOUND");
      }

      const [currentPatient] = await tx
        .select({
          id: patients.id,
        })
        .from(patients)
        .where(eq(patients.userId, session.userId))
        .limit(1);

      if (!currentPatient) {
        throw new Error("PATIENT_NOT_FOUND");
      }

      const emailChanged =
        currentUser.email.trim().toLowerCase() !== email;

      await tx
        .update(users)
        .set({
          name,
          email,
          phone,
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.userId));

      await tx
        .update(patients)
        .set({
          emergencyContactName,
          emergencyContactPhone,
          updatedAt: new Date(),

          ...(emailChanged
            ? {
                isVerified: false,
                emailVerifiedAt: null,
                emailVerificationOtpHash: null,
                emailVerificationOtpExpiresAt: null,
                emailVerificationOtpAttempts: 0,
              }
            : {}),
        })
        .where(eq(patients.userId, session.userId));

      const [profile] = await tx
        .select({
          name: users.name,
          email: users.email,
          phone: users.phone,
          emergencyContactName: patients.emergencyContactName,
          emergencyContactPhone: patients.emergencyContactPhone,
          isVerified: patients.isVerified,
        })
        .from(patients)
        .innerJoin(users, eq(patients.userId, users.id))
        .where(eq(patients.userId, session.userId))
        .limit(1);

      return { profile, emailChanged };
    });

    if (!updatedProfile.profile) {
      return errorResponse(
        "Failed to retrieve the updated profile.",
        500,
      );
    }

    return NextResponse.json({
      message: updatedProfile.emailChanged
        ? "Profile updated. Please verify your new email address."
        : "Profile updated successfully.",
      patient: updatedProfile.profile,
      emailChanged: updatedProfile.emailChanged,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return errorResponse("User account not found.", 404);
      }

      if (error.message === "PATIENT_NOT_FOUND") {
        return errorResponse("Patient profile not found.", 404);
      }
    }

    if (isUniqueConstraintError(error)) {
      return errorResponse(
        "This email address is already registered to another account.",
        409,
      );
    }

    console.error("Update patient profile error:", error);

    return errorResponse(
      "Failed to update patient profile.",
      500,
    );
  }
}
