import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/server/services/auth.service";
import { db } from "@/db";
import { availability, doctors } from "@/db/schema";

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

function todayInIndia(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isValidTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

async function getDoctorForUser(userId: string) {
  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.userId, userId))
    .limit(1);

  return doctor;
}

function getCurrentTimeInIndia(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);

    if (!session) return fail("Not authenticated.", 401);

    const user = await getUserById(session.userId);

    if (!user) {
      return fail("Not authenticated.", 401);
    }

    if (user.role !== "doctor") {
      return fail("Only doctors can manage availability.", 403);
    }

    const doctor = await getDoctorForUser(user.id);

    if (!doctor) return fail("Doctor profile not found.", 404);

    const today = todayInIndia();
    const from = req.nextUrl.searchParams.get("from") ?? today;
    const to = req.nextUrl.searchParams.get("to") ?? addDays(today, 60);

    if (!isValidDate(from) || !isValidDate(to) || from > to) {
      return fail("Please provide a valid date range.", 400);
    }

    const slots = await db
      .select({
        id: availability.id,
        slotDate: availability.slotDate,
        startTime: availability.startTime,
        endTime: availability.endTime,
        status: availability.status,
      })
      .from(availability)
      .where(
        and(
          eq(availability.doctorId, doctor.id),
          // Include all statuses so the doctor can see booked/blocked slots.
        ),
      )
      .orderBy(asc(availability.slotDate), asc(availability.startTime));

    const filteredSlots = slots.filter(
      (slot) => slot.slotDate >= from && slot.slotDate <= to,
    );

    return NextResponse.json({
      success: true,
      slots: filteredSlots,
    });
  } catch (error) {
    console.error("Fetch doctor availability error:", error);
    return fail("Unable to fetch availability.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);

    if (!session) return fail("Not authenticated.", 401);

    const user = await getUserById(session.userId);

    if (!user) {
      return fail("Not authenticated.", 401);
    }

    if (user.role !== "doctor") {
      return fail("Only doctors can create availability.", 403);
    }

    const doctor = await getDoctorForUser(user.id);

    if (!doctor) return fail("Doctor profile not found.", 404);

    const body = (await req.json().catch(() => null)) as {
      slotDate?: unknown;
      startTime?: unknown;
      endTime?: unknown;
    } | null;

    if (!body) return fail("Invalid request body.", 400);

    const { slotDate, startTime, endTime } = body;

    if (
      typeof slotDate !== "string" ||
      typeof startTime !== "string" ||
      typeof endTime !== "string"
    ) {
      return fail("Date, start time, and end time are required.", 400);
    }

    if (!isValidDate(slotDate)) {
      return fail("Please provide a valid date.", 400);
    }

    if (slotDate < todayInIndia()) {
      return fail("You cannot add availability for a past date.", 400);
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return fail("Please provide valid start and end times.", 400);
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (startMinutes >= endMinutes) {
      return fail("End time must be later than start time.", 400);
    }

    if (slotDate === todayInIndia()) {
      const currentTime = getCurrentTimeInIndia();
      const currentMinutes = timeToMinutes(currentTime);

      if (startMinutes <= currentMinutes) {
        return fail(
          `The start time must be later than the current time (${currentTime}) for today's availability.`,
          400,
        );
      }
    }

    const existingSlots = await db
      .select({
        startTime: availability.startTime,
        endTime: availability.endTime,
      })
      .from(availability)
      .where(
        and(
          eq(availability.doctorId, doctor.id),
          eq(availability.slotDate, slotDate),
        ),
      );

    const overlaps = existingSlots.some((slot) => {
      const existingStart = timeToMinutes(slot.startTime);
      const existingEnd = timeToMinutes(slot.endTime);

      return startMinutes < existingEnd && endMinutes > existingStart;
    });

    if (overlaps) {
      return fail(
        "This time overlaps with an existing slot. Choose a different time.",
        409,
      );
    }

    const [createdSlot] = await db
      .insert(availability)
      .values({
        doctorId: doctor.id,
        slotDate,
        startTime,
        endTime,
        status: "available",
      })
      .returning({
        id: availability.id,
        slotDate: availability.slotDate,
        startTime: availability.startTime,
        endTime: availability.endTime,
        status: availability.status,
      });

    return NextResponse.json(
      {
        success: true,
        message: "Availability added successfully.",
        slot: createdSlot,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create doctor availability error:", error);
    return fail("Unable to create availability.", 500);
  }
}
