
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseMedical,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  UserRound,
  AlertCircle,
  HeartPulse,
} from "lucide-react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import api from "@/lib/axios";

interface DoctorProfile {
  id: string;
  doctorCode: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  qualification: string | null;
  experienceYears: number | null;
  isActive: boolean;
}

interface ProfileResponse {
  success: boolean;
  doctor: DoctorProfile;
  message?: string;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;

    if (typeof response === "object" && response !== null && "data" in response) {
      const data = response.data;

      if (
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string"
      ) {
        return data.message;
      }
    }
  }

  return error instanceof Error
    ? error.message
    : "Unable to load your profile. Please try again.";
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3.5 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
        <Icon size={18} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1.5 break-words text-sm font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<ProfileResponse>("/doctor/profile");
      const doctor = response.data.doctor;

      if (!doctor || typeof doctor.isActive !== "boolean") {
        throw new Error("The server returned an invalid doctor profile.");
      }

      setProfile(doctor);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const callfetchProfile = () =>{
        void fetchProfile();
    }
    callfetchProfile()
  }, [fetchProfile]);

  const toggleStatus = async () => {
    if (!profile || updatingStatus) return;

    const nextStatus = !profile.isActive;

    setUpdatingStatus(true);
    setError("");
    setStatusMessage("");

    try {
      const response = await api.patch("/doctor/profile", {
        isActive: nextStatus,
      });

      const updatedDoctor = response.data.doctor;

      if (typeof updatedDoctor?.isActive !== "boolean") {
        throw new Error("The server did not confirm the status update.");
      }

      setProfile((current) =>
        current
          ? { ...current, isActive: updatedDoctor.isActive }
          : current,
      );

      setStatusMessage(
        updatedDoctor.isActive
          ? "Your profile is now active."
          : "Your profile is now inactive.",
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const fullName = profile?.name?.trim() || "Doctor";
  const initials =
    fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "DR";

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <DashboardHeader
        portalLabel="Doctor portal"
        homeHref="/doctor/dashboard"
        loginPath="/doctor/login"
      />

      <main className="mx-auto px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link
            href="/doctor/dashboard"
            className="text-slate-500 transition hover:text-teal-800"
          >
            Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-800">My profile</span>
        </div>

        {/* Page heading */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
              <UserRound size={14} />
              DOCTOR ACCOUNT
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              My profile
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              View your personal details, professional credentials, and
              appointment availability.
            </p>
          </div>

          <Link
            href="/doctor/dashboard"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-5" aria-label="Loading doctor profile">
            <div className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            </div>
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-white p-6 sm:p-8"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertCircle size={23} />
            </div>

            <h2 className="mt-4 font-semibold text-slate-900">
              Unable to load your profile
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>

            <button
              type="button"
              onClick={() => void fetchProfile()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        )}

        {!loading && profile && (
          <>
            <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="h-2 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500" />

              <div className="relative p-5 sm:p-8 lg:p-9">
                <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border border-teal-100" />
                <div className="pointer-events-none absolute -right-2 -top-10 h-48 w-48 rounded-full border border-teal-100/80" />

                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-2xl font-bold text-white shadow-sm sm:h-24 sm:w-24 sm:text-3xl">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                          <Stethoscope size={13} />
                          Doctor
                        </span>

                        {profile.isActive && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}

                        {!profile.isActive && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </div>

                      <h2 className="break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                        Dr. {fullName}
                      </h2>

                      <p className="mt-1.5 text-sm text-slate-500">
                        {profile.specialization || "Specialization not provided"}
                      </p>

                      <p className="mt-2 break-all text-sm text-slate-500">
                        {profile.email || "Email not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex shrink-0 flex-col gap-2 sm:items-end">
                    <span className="text-xs font-medium text-slate-500">
                      Booking status
                    </span>

                    <button
                      type="button"
                      onClick={toggleStatus}
                      disabled={updatingStatus}
                      aria-pressed={profile.isActive}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        profile.isActive
                          ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "bg-teal-800 text-white hover:bg-teal-900"
                      }`}
                    >
                      {updatingStatus ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Activity size={16} />
                      )}

                      {updatingStatus
                        ? "Updating..."
                        : profile.isActive
                          ? "Go inactive"
                          : "Go active"}
                    </button>

                    <p className="max-w-56 text-xs leading-5 text-slate-500 sm:text-right">
                      {profile.isActive
                        ? "Your profile is active for eligible bookings."
                        : "Your profile is inactive for new bookings."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {(error || statusMessage) && (
              <div
                role={error ? "alert" : "status"}
                className={`mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
                  error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {error ? (
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                )}

                <div className="flex-1">{error || statusMessage}</div>

                {error && (
                  <button
                    type="button"
                    onClick={() => setError("")}
                    className="text-xs font-semibold underline underline-offset-4"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <UserRound size={21} />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Personal information
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Your registered contact details
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  <DetailRow
                    icon={UserRound}
                    label="Full name"
                    value={profile.name || "Not provided"}
                  />

                  <DetailRow
                    icon={Mail}
                    label="Email address"
                    value={profile.email || "Not provided"}
                  />

                  <DetailRow
                    icon={Phone}
                    label="Phone number"
                    value={profile.phone || "Not provided"}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <BriefcaseMedical size={21} />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Professional information
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Your medical credentials and experience
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  <DetailRow
                    icon={BadgeCheck}
                    label="Doctor ID"
                    value={profile.doctorCode || "Not assigned"}
                  />

                  <DetailRow
                    icon={Stethoscope}
                    label="Specialization"
                    value={profile.specialization || "Not provided"}
                  />

                  <DetailRow
                    icon={GraduationCap}
                    label="Qualification"
                    value={profile.qualification || "Not provided"}
                  />

                  <DetailRow
                    icon={BriefcaseMedical}
                    label="Clinical experience"
                    value={
                      profile.experienceYears != null
                        ? `${profile.experienceYears} ${
                            profile.experienceYears === 1 ? "year" : "years"
                          }`
                        : "Not provided"
                    }
                  />
                </div>
              </section>
            </div>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1.1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      profile.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {profile.isActive ? (
                      <ShieldCheck size={23} />
                    ) : (
                      <Clock3 size={23} />
                    )}
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Account availability
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {profile.isActive
                        ? "Your doctor profile is active. Patients can book eligible available slots."
                        : "Your doctor profile is inactive. New bookings should be blocked by the booking API."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <div>
                    <p className="text-xs text-slate-500">Current status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {profile.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      profile.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {profile.isActive ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                  <HeartPulse size={22} />
                </div>

                <h2 className="mt-4 font-semibold text-slate-900">
                  Manage your practice
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Keep your appointment schedule and availability up to date
                  so patients can plan their visits.
                </p>

                <div className="mt-5 space-y-3">
                  <Link
                    href="/doctor/availability"
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900"
                  >
                    <span className="flex items-center gap-3">
                      <CalendarDays size={18} />
                      Manage availability
                    </span>
                    <ArrowRight size={17} />
                  </Link>

                  <Link
                    href="/doctor/appointments"
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900"
                  >
                    <span className="flex items-center gap-3">
                      <Clock3 size={18} />
                      View appointments
                    </span>
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </section>

            <footer className="py-8 text-center text-xs text-slate-400">
              Medrella · Doctor workspace
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
