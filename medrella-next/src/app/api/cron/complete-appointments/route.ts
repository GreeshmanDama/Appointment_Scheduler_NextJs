
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { appointments, availability } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getIndiaDateTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (
    !secret ||
    authorization !== `Bearer ${secret}`
  ) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const now = getIndiaDateTime();
    const currentMinutes = timeToMinutes(now.time);

    const confirmedAppointments = await db
      .select({
        appointmentId: appointments.id,
        slotDate: availability.slotDate,
        endTime: availability.endTime,
      })
      .from(appointments)
      .innerJoin(
        availability,
        eq(appointments.availabilityId, availability.id),
      )
      .where(eq(appointments.status, "confirmed"));

    let completedCount = 0;

    for (const appointment of confirmedAppointments) {
      const date = String(appointment.slotDate);
      const endTime = String(appointment.endTime);

      const hasEnded =
        date < now.date ||
        (date === now.date &&
          timeToMinutes(endTime) <= currentMinutes);

      if (!hasEnded) continue;

      const updated = await db
        .update(appointments)
        .set({ status: "completed" })
        .where(
          and(
            eq(appointments.id, appointment.appointmentId),
            eq(appointments.status, "confirmed"),
          ),
        )
        .returning({ id: appointments.id });

      completedCount += updated.length;
    }

    return NextResponse.json({
      success: true,
      message: "Appointment completion check finished.",
      completedCount,
    });
  } catch (error) {
    console.error("Complete appointments cron error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to complete expired appointments.",
      },
      { status: 500 },
    );
  }
}
