import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/server/services/auth.service";
import { getAllPatients } from "@/server/services/patient.service";

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
    const patients = await getAllPatients();

    return NextResponse.json({
      success: true,
      patients,
    });
  } catch (err) {
    console.error(
      "Fetch patients error:",
      err instanceof Error ? err.stack : err,
    );

    return fail("Unable to fetch patients.", 500);
  }
}
