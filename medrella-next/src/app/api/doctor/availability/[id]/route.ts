
import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { appointments, availability, doctors } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const session = await getSession(request);

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Please log in to delete availability." },
        { status: 401 },
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Availability ID is required." },
        { status: 400 },
      );
    }

    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, session.userId))
      .limit(1);

    if (!doctor) {
      return NextResponse.json(
        { success: false, message: "Doctor profile not found." },
        { status: 403 },
      );
    }

    const result = await db.transaction(async (tx) => {
      // Lock the slot so concurrent requests cannot both delete it.
      const [slot] = await tx
        .select({
          id: availability.id,
          status: availability.status,
        })
        .from(availability)
        .where(
          and(
            eq(availability.id, id),
            eq(availability.doctorId, doctor.id),
          ),
        )
        .for("update")
        .limit(1);

      if (!slot) {
        return { error: "NOT_FOUND" as const };
      }

      // A slot cannot be deleted while an active appointment uses it.
      const [activeAppointment] = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.availabilityId, slot.id),
            inArray(appointments.status, ["pending", "confirmed"]),
          ),
        )
        .limit(1);

      if (activeAppointment) {
        return { error: "HAS_ACTIVE_APPOINTMENT" as const };
      }

      const [deleted] = await tx
        .delete(availability)
        .where(
          and(
            eq(availability.id, slot.id),
            eq(availability.doctorId, doctor.id),
          ),
        )
        .returning({ id: availability.id });

      if (!deleted) {
        return { error: "NOT_FOUND" as const };
      }

      return { success: true as const };
    });

    if (result.error === "NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Availability slot not found." },
        { status: 404 },
      );
    }

    if (result.error === "HAS_ACTIVE_APPOINTMENT") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This slot has a pending or confirmed appointment and cannot be deleted.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Availability slot deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE doctor availability error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete the availability slot." },
      { status: 500 },
    );
  }
}
