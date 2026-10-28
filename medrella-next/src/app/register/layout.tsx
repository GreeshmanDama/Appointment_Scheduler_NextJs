import { GuestGate } from "@/components/auth/guest-gate";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestGate>{children}</GuestGate>;
}
