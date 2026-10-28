
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { doctors, users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/server/services/auth.service";

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

interface RouteContext {
  params: Promise<{ id: string }>;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext,
) {
  try {
    // 1. Authenticate the requester.
    const session = await getSession(req);

    if (!session?.userId) {
      return fail("Not authenticated.", 401);
    }

    const user = await getUserById(session.userId);

    if (!user) {
      return fail("Not authenticated.", 401);
    }

    // 2. Authorize admin-only access.
    if (user.role !== "admin") {
      return fail("You are not authorized to update doctors.", 403);
    }

    // 3. Validate the doctor ID.
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return fail("Invalid doctor ID.", 400);
    }

    // 4. Parse and validate the request body.
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return fail("Invalid JSON request body.", 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return fail("Invalid request body.", 400);
    }

    const data = body as Record<string, unknown>;

    const name =
      typeof data.name === "string" ? data.name.trim() : "";
    const phone =
      typeof data.phone === "string" ? data.phone.trim() : "";
    const specialization =
      typeof data.specialization === "string"
        ? data.specialization.trim()
        : "";
    const qualification =
      typeof data.qualification === "string"
        ? data.qualification.trim()
        : "";

    const experienceYears = data.experienceYears;

    if (!name || name.length > 100) {
      return fail("Name is required and must be at most 100 characters.", 400);
    }

    if (!phone || phone.length > 20) {
      return fail("Phone is required and must be at most 20 characters.", 400);
    }

    if (!specialization || specialization.length > 100) {
      return fail("A valid specialization is required.", 400);
    }

    if (!qualification || qualification.length > 150) {
      return fail("A valid qualification is required.", 400);
    }

    if (
      typeof experienceYears !== "number" ||
      !Number.isInteger(experienceYears) ||
      experienceYears < 0 ||
      experienceYears > 80
    ) {
      return fail("Experience must be a whole number between 0 and 80.", 400);
    }

    // 5. Find the doctor by the doctor ID.
    const [existingDoctor] = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
      })
      .from(doctors)
      .where(eq(doctors.id, id))
      .limit(1);

    if (!existingDoctor) {
      return fail("Doctor not found.", 404);
    }

    // 6. Update the user and doctor records together.
    const updatedDoctor = await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          name,
          phone,
        })
        .where(eq(users.id, existingDoctor.userId));

      await tx
        .update(doctors)
        .set({
          specialization,
          qualification,
          experienceYears,
        })
        .where(eq(doctors.id, id));

      const [result] = await tx
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
        .where(eq(doctors.id, id))
        .limit(1);

      return result;
    });

    return NextResponse.json({
      success: true,
      message: "Doctor details updated successfully.",
      doctor: updatedDoctor,
    });
  } catch (error) {
    console.error("PATCH /api/admin/doctors/[id] error:", error);

    return fail("Unable to update doctor details.", 500);
  }
}
