import { NextResponse, type NextRequest } from "next/server";
import { getDoctorById } from "@/server/services/doctor.service";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/server/services/auth.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSession(req);

    if (!session) {
      return fail("Not authenticated.", 401);
    }

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

    const [doctor] = await getDoctorById(id);

    if (!doctor || !doctor.isActive) {
      return fail("Doctor not found.", 404);
    }

    return NextResponse.json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error("Fetch doctor details error:", error);

    return fail("Unable to fetch doctor details.", 500);
  }
}
