import { NextResponse, type NextRequest } from "next/server";
import { count, eq } from "drizzle-orm";

import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/server/services/auth.service";
import { db } from "@/db";
import {
  doctors,
  patients,
  appointments,
} from "@/db/schema";

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

export async function GET(req: NextRequest) {
  // Authenticate the user
  const session = await getSession(req);

  if (!session) {
    return fail("Not authenticated.", 401);
  }

  const caller = await getUserById(session.userId);

  if (!caller) {
    return fail("Not authenticated.", 401);
  }

  // Only admins can access dashboard statistics
  if (caller.role !== "admin") {
    return fail("Forbidden.", 403);
  }

  try {
    const [
      [doctorResult],
      [patientResult],
      [appointmentResult],
      [pendingResult],
      [confirmedResult],
      [completedResult],
      [cancelledResult],
    ] = await Promise.all([
      db
        .select({ total: count() })
        .from(doctors),

      db
        .select({ total: count() })
        .from(patients),

      db
        .select({ total: count() })
        .from(appointments),

      db
        .select({ total: count() })
        .from(appointments)
        .where(eq(appointments.status, "pending")),

      db
        .select({ total: count() })
        .from(appointments)
        .where(eq(appointments.status, "confirmed")),

      db
        .select({ total: count() })
        .from(appointments)
        .where(eq(appointments.status, "completed")),

      db
        .select({ total: count() })
        .from(appointments)
        .where(eq(appointments.status, "cancelled")),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalDoctors: doctorResult.total,
        totalPatients: patientResult.total,
        totalAppointments: appointmentResult.total,
        pendingAppointments: pendingResult.total,
        confirmedAppointments: confirmedResult.total,
        completedAppointments: completedResult.total,
        cancelledAppointments: cancelledResult.total,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return fail("Unable to fetch dashboard statistics.", 500);
  }
}