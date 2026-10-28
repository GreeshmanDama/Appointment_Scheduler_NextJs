import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/server/services/auth.service";
import { getAllAppointments } from "@/server/services/appointment.service";

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session) {
    return fail("Not authenticated.", 401);
  }

  const caller = await getUserById(session.userId);

  if (!caller) {
    return fail("Not authenticated.", 401);
  }

  if (caller.role !== "admin") {
    return fail("Forbidden.", 403);
  }

  try {
    const appointments = await getAllAppointments();

    return NextResponse.json({
      success: true,
      appointments,
    });
  } catch (err) {
    console.error("Fetch appointments error:", err);
    return fail("Unable to fetch appointments.", 500);
  }
}