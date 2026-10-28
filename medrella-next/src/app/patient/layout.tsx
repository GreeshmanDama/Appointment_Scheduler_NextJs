import { AuthGate } from "@/components/auth/auth-gate";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate role="patient" loginPath="/login">
      {children}
    </AuthGate>
  );
}