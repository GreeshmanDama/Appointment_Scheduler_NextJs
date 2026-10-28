import DoctorProfileClient from "./doctor-profile-client";

interface DoctorProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function DoctorProfilePage({
  params,
}: DoctorProfilePageProps) {
  const { id } = await params;

  return <DoctorProfileClient id={id} />;
}