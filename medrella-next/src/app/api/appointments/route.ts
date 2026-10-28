import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { users, patients, availability, appointments } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function todayInIndia(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function currentTimeInIndia(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session?.userId) {
      return fail("Please log in to book an appointment.", 401);
    }

    const userResult = await db
      .select({
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const user = userResult[0];

    if (!user) {
      return fail("Your account is unavailable.", 403);
    }

    if (user.role !== "patient") {
      return fail("Only patients can book appointments.", 403);
    }

    const patientResult = await db
      .select({
        id: patients.id,
        isVerified: patients.isVerified,
      })
      .from(patients)
      .where(eq(patients.userId, user.id))
      .limit(1);

    const patient = patientResult[0];

    if (!patient) {
      return fail("Patient profile not found.", 404);
    }

    if (!patient.isVerified) {
      return fail("Verify your account to book an appointment.", 403);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return fail("Invalid request body.", 400);
    }

    if (typeof body !== "object" || body === null) {
      return fail("Invalid booking details.", 400);
    }

    const payload = body as Record<string, unknown>;
    const availabilityId = payload.availabilityId;
    const reason = payload.reason;

    if (
      typeof availabilityId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        availabilityId,
      )
    ) {
      return fail("Please select a valid appointment slot.", 400);
    }

    if (
      typeof reason !== "string" ||
      reason.trim().length < 5 ||
      reason.trim().length > 1000
    ) {
      return fail(
        "Please provide a reason of at least 5 characters and no more than 1000 characters.",
        400,
      );
    }

    const booking = await db.transaction(async (tx) => {
      const [slot] = await tx
        .select({
          id: availability.id,
          doctorId: availability.doctorId,
          slotDate: availability.slotDate,
          startTime: availability.startTime,
          status: availability.status,
        })
        .from(availability)
        .where(eq(availability.id, availabilityId))
        .limit(1);

      if (!slot) {
        return { error: "Appointment slot not found.", status: 404 };
      }

      if (slot.status !== "available") {
        return {
          error:
            "This slot is no longer available. Please choose another time.",
          status: 409,
        };
      }

      const today = todayInIndia();

      if (slot.slotDate < today) {
        return {
          error: "You cannot book an appointment in the past.",
          status: 400,
        };
      }

      if (
        slot.slotDate === today &&
        timeToMinutes(slot.startTime) <= timeToMinutes(currentTimeInIndia())
      ) {
        return {
          error: "This appointment time has already passed in India.",
          status: 400,
        };
      }

      const reserved = await tx
        .update(availability)
        .set({
          status: "booked",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(availability.id, slot.id),
            eq(availability.status, "available"),
          ),
        )
        .returning({ id: availability.id });

      if (reserved.length === 0) {
        return {
          error:
            "This slot was just booked by someone else. Please choose another.",
          status: 409,
        };
      }

      const [appointment] = await tx
        .insert(appointments)
        .values({
          patientId: patient.id,
          doctorId: slot.doctorId,
          availabilityId: slot.id,
          status: "pending",
          reason: reason.trim(),
        })
        .returning({
          id: appointments.id,
          status: appointments.status,
          reason: appointments.reason,
          availabilityId: appointments.availabilityId,
          doctorId: appointments.doctorId,
          createdAt: appointments.createdAt,
        });

      return { appointment };
    });

    if (
      "error" in booking &&
      booking.error !== undefined &&
      booking.status !== undefined
    ) {
      return fail(booking.error, booking.status);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Appointment request submitted successfully.",
        appointment: booking.appointment,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return fail(
        "This slot has already been booked. Please select another time.",
        409,
      );
    }

    console.error("Create appointment error:", error);

    return fail("Unable to book this appointment right now.", 500);
  }
}
