import { AuthGate } from "@/components/auth/auth-gate";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate role="admin" loginPath="/admin/login">
      {children}
    </AuthGate>
  );
}