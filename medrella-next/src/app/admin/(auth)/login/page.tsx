import StaffLoginPage from "@/components/auth/StaffLoginPage";

export const metadata = { title: "Admin Login" };

export default function AdminLogin() {
  return <StaffLoginPage role="admin" />;
}
