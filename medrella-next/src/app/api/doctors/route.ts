import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/server/services/auth.service";
import { getAllDoctors } from "@/server/services/doctor.service";

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);

    if (!session) {
      return fail("Not authenticated.", 401);
    }

    const user = await getUserById(session.userId);

    if (!user) {
      return fail("Not authenticated.", 401);
    }

    const allDoctors = await getAllDoctors();
    const doctors = allDoctors.filter((doctor) => doctor.isActive);

    return NextResponse.json({
      success: true,
      doctors,
    });
  } catch (error) {
    console.error("Fetch doctors error:", error);

    return fail("Unable to fetch doctors.", 500);
  }
}

