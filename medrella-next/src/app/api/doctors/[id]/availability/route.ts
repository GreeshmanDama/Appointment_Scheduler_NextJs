import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";

import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/server/services/auth.service";
import { db } from "@/db";
import { availability, doctors, users } from "@/db/schema";

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

interface RouteContext {
  params: Promise<{ id: string }>;
}

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
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSession(req);

    if (!session) return fail("Not authenticated.", 401);

    const user = await getUserById(session.userId);

    if (!user) {
      return fail("Not authenticated.", 401);
    }

    const { id } = await params;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return fail("Invalid doctor ID.", 400);
    }

    const today = todayInIndia();
    const from = req.nextUrl.searchParams.get("from") ?? today;
    const to = req.nextUrl.searchParams.get("to") ?? addDays(today, 60);

    if (
      !isValidDate(from) ||
      !isValidDate(to) ||
      from > to ||
      to < today
    ) {
      return fail("Please provide a valid future date range.", 400);
    }

    const slots = await db
      .select({
        id: availability.id,
        slotDate: availability.slotDate,
        startTime: availability.startTime,
        endTime: availability.endTime,
      })
      .from(availability)
      .innerJoin(
        doctors,
        eq(availability.doctorId, doctors.id),
      )
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(
        and(
          eq(availability.doctorId, id),
          eq(availability.status, "available"),
          gte(availability.slotDate, from),
          lte(availability.slotDate, to),
        ),
      )
      .orderBy(asc(availability.slotDate), asc(availability.startTime))
      .limit(250);

    return NextResponse.json({
      success: true,
      slots,
    });
  } catch (error) {
    console.error("Fetch patient-facing availability error:", error);
    return fail("Unable to fetch available appointment slots.", 500);
  }
}