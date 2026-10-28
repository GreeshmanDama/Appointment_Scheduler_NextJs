
import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  appointments,
  doctors,
  availability,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getSession(request);

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const { status, cancellationReason } = body;

    if (!["confirmed", "cancelled"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be confirmed or cancelled",
        },
        { status: 400 }
      );
    }

    if (
      status === "cancelled" &&
      (typeof cancellationReason !== "string" ||
        cancellationReason.trim().length < 3 ||
        cancellationReason.trim().length > 500)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cancellation reason must be between 3 and 500 characters",
        },
        { status: 400 }
      );
    }

    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, session.userId))
      .limit(1);

    if (!doctor) {
      return NextResponse.json(
        { success: false, message: "Doctor profile not found" },
        { status: 403 }
      );
    }

    const [appointment] = await db
      .select({
        id: appointments.id,
        status: appointments.status,
        availabilityId: appointments.availabilityId,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.doctorId, doctor.id)
        )
      )
      .limit(1);

    if (!appointment) {
      return NextResponse.json(
        { success: false, message: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appointment.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message: "Only pending appointments can be updated",
        },
        { status: 409 }
      );
    }

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(appointments)
        .set({
          status,
          cancellationReason:
            status === "cancelled"
              ? cancellationReason.trim()
              : null,
          cancelledAt:
            status === "cancelled" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(appointments.id, id),
            eq(appointments.doctorId, doctor.id),
            eq(appointments.status, "pending")
          )
        )
        .returning({ id: appointments.id });

      if (!updated) {
        throw new Error("APPOINTMENT_ALREADY_PROCESSED");
      }

      if (status === "cancelled") {
        const [slot] = await tx
          .select({
            id: availability.id,
            slotDate: availability.slotDate,
          })
          .from(availability)
          .where(eq(availability.id, appointment.availabilityId))
          .limit(1);

        if (slot) {
          const [activeAppointment] = await tx
            .select({ id: appointments.id })
            .from(appointments)
            .where(
              and(
                eq(
                  appointments.availabilityId,
                  appointment.availabilityId
                ),
                inArray(appointments.status, [
                  "pending",
                  "confirmed",
                ])
              )
            )
            .limit(1);

          const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
          });

          if (
            !activeAppointment &&
            slot.slotDate >= today
          ) {
            await tx
              .update(availability)
              .set({ status: "available" })
              .where(
                and(
                  eq(availability.id, slot.id),
                  eq(availability.status, "booked")
                )
              );
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message:
        status === "confirmed"
          ? "Appointment accepted successfully"
          : "Appointment rejected and slot released if eligible",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "APPOINTMENT_ALREADY_PROCESSED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This appointment has already been processed",
        },
        { status: 409 }
      );
    }

    console.error("PATCH appointment status error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update appointment" },
      { status: 500 }
    );
  }
}
