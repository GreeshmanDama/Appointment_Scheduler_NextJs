import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifyToken } from "./jwt";

export async function getSession(req: NextRequest) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : req.cookies.get(AUTH_COOKIE)?.value;

  if (!token) return null;

  return verifyToken(token);
}
