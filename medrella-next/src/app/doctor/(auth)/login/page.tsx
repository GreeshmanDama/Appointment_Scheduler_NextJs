import StaffLoginPage from "@/components/auth/StaffLoginPage";

export const metadata = { title: "Doctor Login" };

export default function AdminLogin() {
  return <StaffLoginPage role="doctor" />;
}