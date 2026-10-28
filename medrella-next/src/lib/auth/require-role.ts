// src/lib/auth/require-role.ts

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_COOKIE,
  verifyToken,
  type UserRole,
} from "@/lib/auth/jwt";

import { getUserById } from "@/server/services/auth.service";

export async function requireRole(
  role: UserRole,
  loginPath: string,
) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;

  const user = session
    ? await getUserById(session.userId)
    : null;

  if (!user) {
    redirect(loginPath);
  }

  if (user.role !== role) {
    redirect(`/${user.role}/dashboard`);
  }

  return user;
}