import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/server/services/auth.service";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 },
    );
  }

  const user = await getUserById(session.userId);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 },
    );
  }

  return NextResponse.json({ success: true, user });
}
