import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users, doctors } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const [doctor] = await db
      .select({
        id: doctors.id,
        doctorCode: doctors.doctorCode,
        specialization: doctors.specialization,
        qualification: doctors.qualification,
        experienceYears: doctors.experienceYears,
        isActive: doctors.isActive,
        name: users.name,
        email: users.email,
        phone: users.phone,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.userId, session.userId))
      .limit(1);

    if (!doctor) {
      return NextResponse.json(
        { success: false, message: "Doctor profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error("GET /api/doctor/profile error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load doctor profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: unknown = await req.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("isActive" in body) ||
      typeof body.isActive !== "boolean"
    ) {
      return NextResponse.json(
        { success: false, message: "A boolean isActive value is required." },
        { status: 400 },
      );
    }

    const [updatedDoctor] = await db
      .update(doctors)
      .set({ isActive: body.isActive })
      .where(eq(doctors.userId, session.userId))
      .returning({
        id: doctors.id,
        isActive: doctors.isActive,
      });

    if (!updatedDoctor) {
      return NextResponse.json(
        { success: false, message: "Doctor profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      doctor: updatedDoctor,
      message: "Availability status updated successfully.",
    });
  } catch (error) {
    console.error("PATCH /api/doctor/profile error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update availability status." },
      { status: 500 },
    );
  }
}
