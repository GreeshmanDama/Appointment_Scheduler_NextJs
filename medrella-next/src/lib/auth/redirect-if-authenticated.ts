import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE, verifyToken, type UserRole } from "@/lib/auth/jwt";
import { getUserById } from "@/server/services/auth.service";

export const ROLE_HOME: Record<UserRole, string> = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  admin: "/admin/dashboard",
};

export async function redirectIfAuthenticated() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;
  const user = session ? await getUserById(session.userId) : null;

  if (user) redirect(ROLE_HOME[user.role]);
}
