import { Suspense } from "react";

import { UserProvider } from "@/components/providers/user-provider";
import type { UserRole } from "@/lib/auth/jwt";
import { requireRole } from "@/lib/auth/require-role";

interface AuthGateProps {
  role: UserRole;
  loginPath: string;
  children: React.ReactNode;
}

async function Gate({
  role,
  loginPath,
  children,
}: AuthGateProps) {
  const user = await requireRole(role, loginPath);

  return (
    <UserProvider user={user}>
      {children}
    </UserProvider>
  );
}

export function AuthGate(props: AuthGateProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Loading...
        </div>
      }
    >
      <Gate {...props} />
    </Suspense>
  );
}