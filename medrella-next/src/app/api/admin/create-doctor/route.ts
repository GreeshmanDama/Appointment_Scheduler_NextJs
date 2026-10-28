import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createDoctorSchema } from "@/lib/validations/doctor";
import { AuthError, getUserById } from "@/server/services/auth.service";
import { createDoctor } from "@/server/services/doctor.service";

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return fail("Not authenticated.", 401);

  const caller = await getUserById(session.userId);
  if (!caller) return fail("Not authenticated.", 401);
  if (caller.role !== "admin") return fail("Forbidden.", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body.", 400);
  }

  const parsed = createDoctorSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  try {
    const doctor = await createDoctor(parsed.data);

    return NextResponse.json(
      { success: true, message: "Doctor created successfully.", doctor },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthError) return fail(err.message, err.status);

    console.error("Doctor creation error:", err);
    return fail("Unable to create doctor account.", 500);
  }
}
