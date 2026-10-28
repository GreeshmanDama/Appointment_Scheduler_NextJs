import { NextResponse, type NextRequest } from "next/server";

import { setAuthCookie, signToken } from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/validations/auth";
import { AuthError, loginUser } from "@/server/services/auth.service";

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
      { status: 400 },
    );
  }

  try {
    const user = await loginUser(parsed.data);
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
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: err.status },
      );
    }

    console.error("[auth/login]", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
