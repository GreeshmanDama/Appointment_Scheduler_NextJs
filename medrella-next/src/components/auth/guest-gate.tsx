import { Suspense } from "react";

import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";

// Reads cookies and the database, so it lives inside <Suspense>
// (required when Cache Components is enabled).
async function Gate({ children }: { children: React.ReactNode }) {
  await redirectIfAuthenticated();
  return <>{children}</>;
}

export function GuestGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
