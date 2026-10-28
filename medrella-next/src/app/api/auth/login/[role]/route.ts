import { NextResponse, type NextRequest } from "next/server";

import { setAuthCookie, signToken } from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/validations/auth";
import { AuthError, loginUser } from "@/server/services/auth.service";

const STAFF_ROLES = ["doctor", "admin"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ role: string }> },
) {
  const { role } = await params;

  if (!STAFF_ROLES.includes(role as StaffRole)) {
    return fail("Not found.", 404);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body.", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  try {
    // loginUser verifies the password first, then enforces the role
    const user = await loginUser(parsed.data, role as StaffRole);
    const token = await signToken({ sub: user.id, role: user.role });

    const res = NextResponse.json({
      success: true,
      message: "Logged in successfully.",
      token,
      user,
    });

    setAuthCookie(res, token);
    return res;
  } catch (err) {
    if (err instanceof AuthError) return fail(err.message, err.status);

    console.error(`[auth/login/${role}]`, err);
    return fail("Something went wrong. Please try again.", 500);
  }
}
