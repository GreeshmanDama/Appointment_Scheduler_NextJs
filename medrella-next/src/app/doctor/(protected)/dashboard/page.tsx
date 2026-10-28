"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Stethoscope,
  UserRound,
  Users,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useUser } from "@/components/providers/user-provider";
import api from "@/lib/axios";

interface Appointment {
  id: string;
  status: string;
  patient: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  appointmentDate: string;
  startTime: string;
  endTime: string;
}

interface DoctorProfile {
  specialization: string | null;
  qualification: string | null;
  experienceYears: number | null;
  doctorCode?: string | null;
  isActive: boolean;
}

interface AppointmentsResponse {
  success: boolean;
  appointments: Appointment[];
  message?: string;
}

const actions = [
  {
    icon: CalendarDays,
    eyebrow: "APPOINTMENTS",
    title: "Manage appointments",
    description:
      "Review your schedule and keep track of upcoming patient visits.",
    href: "/doctor/appointments",
    iconStyle: "bg-teal-50 text-teal-700",
  },
  {
    icon: Clock3,
    eyebrow: "AVAILABILITY",
    title: "Manage availability",
    description:
      "Set your available dates and time slots for patient bookings.",
    href: "/doctor/availability",
    iconStyle: "bg-blue-50 text-blue-700",
  },
  {
    icon: Users,
    eyebrow: "PATIENT CARE",
    title: "View my patients",
    description: "Access the patients associated with your appointments.",
    href: "/doctor/patients",
    iconStyle: "bg-violet-50 text-violet-700",
  },
];

const ACTIVE_STATUSES = ["booked", "confirmed", "pending"];

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getAppointmentDateTime(appointment: Appointment) {
  // Assumes appointmentDate is YYYY-MM-DD and startTime is HH:mm[:ss].
  return new Date(`${appointment.appointmentDate}T${appointment.startTime}`);
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;

    if (
      typeof response === "object" &&
      response !== null &&
      "data" in response
    ) {
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

  return "Unable to load your appointment statistics.";
}

export default function DoctorDashboard() {
  const user = useUser();

  const firstName = user.name.trim().split(/\s+/)[0] || "Doctor";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(
    null,
  );
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");

  const toggleDoctorStatus = async () => {
    if (!doctorProfile || updatingStatus) return;

    setUpdatingStatus(true);
    setStatusError("");

    try {
      const response = await api.patch("/doctor/profile", {
        isActive: !doctorProfile.isActive,
      });

      const updatedDoctor =
        response.data.doctor ?? response.data.profile ?? response.data;

      setDoctorProfile((current) =>
        current
          ? {
              ...current,
              isActive:
                typeof updatedDoctor.isActive === "boolean"
                  ? updatedDoctor.isActive
                  : !current.isActive,
            }
          : current,
      );
    } catch (error: unknown) {
      setStatusError(getErrorMessage(error));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const fetchAppointments = useCallback(async () => {
    setLoadingStats(true);
    setStatsError("");

    try {
      const response = await api.get<AppointmentsResponse>(
        "/doctor/appointments",
      );

      setAppointments(response.data.appointments ?? []);
    } catch (error: unknown) {
      setStatsError(getErrorMessage(error));
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchDoctorProfile() {
      setLoadingProfile(true);

      try {
        const response = await api.get("/doctor/profile");

        if (!cancelled) {
          setDoctorProfile(
            response.data.doctor ?? response.data.profile ?? response.data,
          );
        }
      } catch (error) {
        console.error("Failed to load doctor profile:", error);

        if (!cancelled) {
          setDoctorProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    void fetchDoctorProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const callfetchappointment = () => {
      void fetchAppointments();
    };
    callfetchappointment();
  }, [fetchAppointments, refreshKey]);

  useEffect(() => {
    const callsetnow = () => {
      setNow(new Date());
    };
    callsetnow();
  }, []);

  const stats = useMemo(() => {
    if (!now) {
      return {
        today: 0,
        upcoming: 0,
        patients: 0,
      };
    }

    const todayKey = getLocalDateKey(now);
    const currentTime = now.getTime();

    const today = appointments.filter((appointment) => {
      return (
        appointment.appointmentDate === todayKey &&
        ACTIVE_STATUSES.includes(appointment.status.toLowerCase())
      );
    }).length;

    const upcoming = appointments.filter((appointment) => {
      const dateTime = getAppointmentDateTime(appointment);

      return (
        !Number.isNaN(dateTime.getTime()) &&
        dateTime.getTime() > currentTime &&
        ACTIVE_STATUSES.includes(appointment.status.toLowerCase())
      );
    }).length;

    const patients = new Set(
      appointments
        .map((appointment) => appointment.patient?.id)
        .filter((id): id is string => Boolean(id)),
    ).size;

    return { today, upcoming, patients };
  }, [appointments, now]);

  const statCards = [
    {
      label: "Today's appointments",
      value: stats.today,
      detail: "Scheduled for today",
      icon: CalendarDays,
      iconStyle: "bg-teal-50 text-teal-700",
      href: "/doctor/appointments",
    },
    {
      label: "Upcoming appointments",
      value: stats.upcoming,
      detail: "Future booked visits",
      icon: Clock3,
      iconStyle: "bg-blue-50 text-blue-700",
      href: "/doctor/appointments",
    },
    {
      label: "My patients",
      value: stats.patients,
      detail: "Unique patients with appointments",
      icon: Users,
      iconStyle: "bg-violet-50 text-violet-700",
      href: "/doctor/patients",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900">
      <DashboardHeader
        portalLabel="Doctor portal"
        homeHref="/doctor/dashboard"
        loginPath="/doctor/login"
      />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        {/* Welcome banner */}
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-800 via-teal-800 to-emerald-900 px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-14 h-52 w-52 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-white/[0.04] blur-2xl" />

          <div className="relative z-10 flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-teal-50">
                <Activity size={14} />
                <span>DOCTOR WORKSPACE</span>
                <span className="h-1 w-1 rounded-full bg-emerald-300" />
                <span>Welcome back</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Hello, Dr. {firstName}
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-teal-50/80 sm:text-base">
                Your workspace for patient appointments, availability, and
                everyday practice management.
              </p>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center self-start rounded-3xl border border-white/15 bg-white/10 shadow-inner sm:self-center">
              <HeartPulse size={42} strokeWidth={1.5} />
            </div>
          </div>

          <div className="relative z-10 mt-8 flex flex-wrap items-center gap-3 border-t border-white/15 pt-5">
            <div className="flex items-center gap-2 text-sm text-teal-50/90">
              <ShieldCheck size={17} />
              Secure doctor portal
            </div>
            <span className="hidden h-4 w-px bg-white/20 sm:block" />
            <div className="flex items-center gap-2 text-sm text-teal-50/90">
              <CheckCircle2 size={17} />
              Your practice, in one place
            </div>
          </div>
        </section>

        {/* Availability status */}
        <section className="mb-8">
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  doctorProfile?.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Activity size={23} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-900">
                    Booking availability
                  </h2>

                  {!loadingProfile && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        doctorProfile?.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {doctorProfile?.isActive ? "Active" : "Inactive"}
                    </span>
                  )}
                </div>

                <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">
                  {loadingProfile
                    ? "Loading your current availability..."
                    : doctorProfile?.isActive
                      ? "Your profile is active. Patients may book your available time slots."
                      : "Your profile is inactive. New patient bookings should be disabled."}
                </p>

                {statusError && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {statusError}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={toggleDoctorStatus}
              disabled={loadingProfile || !doctorProfile || updatingStatus}
              aria-pressed={doctorProfile?.isActive ?? false}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                doctorProfile?.isActive
                  ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  : "bg-teal-800 text-white hover:bg-teal-900"
              }`}
            >
              {updatingStatus ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  {doctorProfile?.isActive ? "Go inactive" : "Go active"}
                </>
              )}
            </button>
          </div>
        </section>

        {/* Live overview */}
        <section className="mb-9">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Overview</h2>
              <p className="mt-1 text-sm text-slate-500">
                A quick look at your schedule and patients.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loadingStats}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={loadingStats ? "animate-spin" : ""}
              />
              Refresh stats
            </button>
          </div>

          {statsError && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={18} />
              <span className="flex-1">{statsError}</span>
              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                className="font-semibold underline underline-offset-4"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {statCards.map(
              ({ label, value, detail, icon: Icon, iconStyle, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {label}
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                        {loadingStats ? "—" : value}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">{detail}</p>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconStyle}`}
                    >
                      <Icon size={21} />
                    </div>
                  </div>
                </Link>
              ),
            )}
          </div>
        </section>

        {/* Quick actions */}
        <section className="mb-9">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Your workspace
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Shortcuts to the tools you use most.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {actions.map(
              ({
                icon: Icon,
                eyebrow,
                title,
                description,
                href,
                iconStyle,
              }) => (
                <Link
                  key={title}
                  href={href}
                  className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-md sm:p-6"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconStyle}`}
                    >
                      <Icon size={22} />
                    </div>
                    <ArrowRight
                      size={19}
                      className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal-700"
                    />
                  </div>

                  <p className="mt-5 text-[10px] font-bold tracking-[0.16em] text-slate-400">
                    {eyebrow}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                    {description}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-800">
                    Open workspace
                    <ArrowRight
                      size={15}
                      className="transition group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              ),
            )}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_0.7fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                  <UserRound size={23} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Doctor profile
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Your professional information
                  </p>
                </div>
              </div>

              <Link
                href="/doctor/profile"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
              >
                View profile
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Full name</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {user.name || "Not provided"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Specialization
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {loadingProfile
                    ? "Loading..."
                    : doctorProfile?.specialization || "Not provided"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Qualification
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {loadingProfile
                    ? "Loading..."
                    : doctorProfile?.qualification || "Not provided"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Experience</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {loadingProfile
                    ? "Loading..."
                    : doctorProfile?.experienceYears != null
                      ? `${doctorProfile.experienceYears} ${
                          doctorProfile.experienceYears === 1 ? "year" : "years"
                        }`
                      : "Not provided"}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="break-all text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Sparkles size={21} />
              </div>
              <h2 className="mt-5 text-lg font-semibold">
                Focus on patient care
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Keep your availability up to date and review your appointments
                regularly to help patients plan their visits.
              </p>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Stethoscope
                  size={18}
                  className="mt-0.5 shrink-0 text-teal-800"
                />
                <p className="text-xs leading-5 text-slate-600">
                  Your appointment and patient management tools are available
                  from the workspace shortcuts above.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">
          Medrella · Doctor workspace
        </footer>
      </main>
    </div>
  );
}
