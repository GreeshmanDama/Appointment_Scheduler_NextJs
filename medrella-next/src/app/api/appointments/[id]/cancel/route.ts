import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { appointments, patients, availability } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getIndiaDateAndTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSession(request);

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Please log in to cancel an appointment." },
        { status: 401 },
      );
    }

    const { id } = await params;

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.userId, session.userId))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { success: false, message: "Patient profile not found." },
        { status: 403 },
      );
    }

    let body: { cancellationReason?: unknown } = {};

    try {
      body = await request.json();
    } catch {
      // An optional reason can be omitted or the request body can be empty.
    }

    const reason =
      typeof body.cancellationReason === "string"
        ? body.cancellationReason.trim()
        : "";

    if (reason.length < 3 || reason.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please provide a cancellation reason between 3 and 500 characters.",
        },
        { status: 400 },
      );
    }

    const result = await db.transaction(async (tx) => {
      const [appointment] = await tx
        .select({
          id: appointments.id,
          status: appointments.status,
          availabilityId: appointments.availabilityId,
        })
        .from(appointments)
        .where(
          and(eq(appointments.id, id), eq(appointments.patientId, patient.id)),
        )
        .limit(1);

      if (!appointment) {
        return { error: "NOT_FOUND" as const };
      }

      if (
        appointment.status !== "pending" &&
        appointment.status !== "confirmed"
      ) {
        return { error: "NOT_CANCELLABLE" as const };
      }

      const [updated] = await tx
        .update(appointments)
        .set({
          status: "cancelled",
          cancellationReason: reason,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(appointments.id, id),
            eq(appointments.patientId, patient.id),
            inArray(appointments.status, ["pending", "confirmed"]),
          ),
        )
        .returning({ id: appointments.id });

      if (!updated) {
        return { error: "NOT_CANCELLABLE" as const };
      }

      const [slot] = await tx
        .select({
          id: availability.id,
          slotDate: availability.slotDate,
          startTime: availability.startTime,
          status: availability.status,
        })
        .from(availability)
        .where(eq(availability.id, appointment.availabilityId))
        .limit(1);

      if (slot && slot.status === "booked") {
        const [activeAppointment] = await tx
          .select({ id: appointments.id })
          .from(appointments)
          .where(
            and(
              eq(appointments.availabilityId, appointment.availabilityId),
              inArray(appointments.status, ["pending", "confirmed"]),
            ),
          )
          .limit(1);

        const now = getIndiaDateAndTime();
        const slotDate = String(slot.slotDate).slice(0, 10);
        const slotTime = String(slot.startTime).slice(0, 5);

        const isFutureSlot =
          slotDate > now.date || (slotDate === now.date && slotTime > now.time);

        if (!activeAppointment && isFutureSlot) {
          await tx
            .update(availability)
            .set({ status: "available" })
            .where(
              and(
                eq(availability.id, slot.id),
                eq(availability.status, "booked"),
              ),
            );
        }
      }

      return { success: true as const };
    });

    if (result.error === "NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Appointment not found." },
        { status: 404 },
      );
    }

    if (result.error === "NOT_CANCELLABLE") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This appointment has already been cancelled or can no longer be cancelled.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment cancelled successfully.",
    });
  } catch (error) {
    console.error("POST cancel appointment error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to cancel the appointment." },
      { status: 500 },
    );
  }
}
