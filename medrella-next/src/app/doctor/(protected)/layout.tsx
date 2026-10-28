import { AuthGate } from "@/components/auth/auth-gate";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate role="doctor" loginPath="/doctor/login">
      {children}
    </AuthGate>
  );
}