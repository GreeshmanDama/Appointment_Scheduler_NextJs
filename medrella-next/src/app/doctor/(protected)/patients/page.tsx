"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import api from "@/lib/axios";

type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "pending"
  | "completed"
  | "cancelled"
  | "rejected"
  | "no_show"
  | string;

interface Patient {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

interface Appointment {
  id: string;
  status: string;
  reason?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  createdAt: string;

  patient: Patient;

  doctor: {
    id: string;
    name: string | null;
    doctorCode: string;
    specialization: string;
  };

  availabilityId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}

interface AppointmentsResponse {
  success: boolean;
  appointments: Appointment[];
  message?: string;
}

const statusStyles: Record<string, string> = {
  booked: "bg-blue-50 text-blue-700 ring-blue-600/20",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  completed: "bg-gray-100 text-gray-700 ring-gray-500/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  no_show: "bg-orange-50 text-orange-700 ring-orange-600/20",
};

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatAppointmentDate(value: string) {
  // Supports a database DATE value such as "2026-10-29".
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match) {
    const [, year, month, day] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    ).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function formatAppointmentTime(value: string) {
  // Supports a database TIME value such as "14:30:00".
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value);

  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours > 23 || minutes > 59) return value;

    const date = new Date(2000, 0, 1, hours, minutes);

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return value;
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

  return "Unable to load appointments. Please try again.";
}

export default function DoctorPatientsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<AppointmentsResponse>(
        "/doctor/appointments",
      );

      setAppointments(response.data.appointments ?? []);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const callfetchAppointments = () => {
      void fetchAppointments();
    };
    callfetchAppointments();
  }, [fetchAppointments, refreshKey]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();

    return appointments.filter((appointment) => {
      const appointmentDateTime = new Date(
        `${appointment.appointmentDate}T${appointment.startTime}`,
      );

      return (
        !Number.isNaN(appointmentDateTime.getTime()) &&
        appointmentDateTime >= now &&
        ["booked", "confirmed", "pending"].includes(
          appointment.status.toLowerCase(),
        )
      );
    });
  }, [appointments]);

  const completedAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => appointment.status.toLowerCase() === "completed",
      ),
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...appointments]
      .filter((appointment) => {
        const patient = appointment.patient;
        const matchesSearch =
          !query ||
          patient?.name?.toLowerCase().includes(query) ||
          patient?.email?.toLowerCase().includes(query) ||
          patient?.phone?.toLowerCase().includes(query);

        const matchesStatus =
          statusFilter === "all" ||
          appointment.status.toLowerCase() === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.appointmentDate}T${a.startTime}`).getTime();

        const dateB = new Date(`${b.appointmentDate}T${b.startTime}`).getTime();

        return dateA - dateB;
      });
  }, [appointments, search, statusFilter]);

  const filters = [
    { label: "All appointments", value: "all" },
    { label: "Booked", value: "booked" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Pending", value: "pending" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        {/* Header */}
        <header className="mb-9 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-black text-white">
              <Users size={23} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">My Patients</h1>
              <p className="text-sm text-gray-500">
                Manage your appointments and patient visits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <Link
              href="/doctor/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>
          </div>
        </header>

        {/* Intro */}
        <section className="mb-7 rounded-3xl bg-black px-6 py-8 text-white sm:px-9 sm:py-10">
          <p className="mb-3 text-sm font-medium text-gray-400">
            DOCTOR PORTAL
          </p>

          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your patient appointments
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
            Keep track of scheduled visits, review patient contact details, and
            see which appointments are coming up.
          </p>
        </section>

        {/* Summary cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total appointments"
            value={appointments.length}
            description="All recorded visits"
            icon={<CalendarDays size={20} />}
          />

          <SummaryCard
            title="Upcoming"
            value={upcomingAppointments.length}
            description="Scheduled visits"
            icon={<Clock3 size={20} />}
          />

          <SummaryCard
            title="Completed"
            value={completedAppointments.length}
            description="Finished appointments"
            icon={<CheckCircle2 size={20} />}
          />

          <SummaryCard
            title="Unique patients"
            value={
              new Set(
                appointments.map((appointment) => appointment.patient?.id),
              ).size
            }
            description="Patients with appointments"
            icon={<Users size={20} />}
          />
        </section>

        {/* Appointment list */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Appointment schedule</h2>
            <p className="mt-1 text-sm text-gray-500">
              Find patients and review their appointment details.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by patient name, email, or phone"
                  aria-label="Search patients"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by appointment status"
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-gray-400"
              >
                {filters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-xl border border-gray-100 p-5"
                >
                  <div className="flex gap-4">
                    <div className="size-12 rounded-xl bg-gray-200" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-1/3 rounded bg-gray-200" />
                      <div className="h-3 w-1/2 rounded bg-gray-100" />
                      <div className="h-3 w-1/4 rounded bg-gray-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertCircle size={25} />
              </div>
              <h3 className="mt-4 font-semibold">
                Unable to load appointments
              </h3>
              <p className="mt-2 text-sm text-gray-500">{error}</p>
              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Try again
              </button>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                <CalendarDays size={25} />
              </div>
              <h3 className="mt-4 font-semibold">
                {appointments.length === 0
                  ? "No appointments yet"
                  : "No matching appointments"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                {appointments.length === 0
                  ? "When patients book appointments with you, they will appear here."
                  : "Try another search term or change the appointment status filter."}
              </p>
              {(search || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="mt-4 text-sm font-semibold underline underline-offset-4"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 sm:px-6">
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-900">
                    {filteredAppointments.length}
                  </span>{" "}
                  {filteredAppointments.length === 1
                    ? "appointment"
                    : "appointments"}
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredAppointments.map((appointment) => {
                  const patient = appointment.patient;
                  const status = appointment.status.toLowerCase();

                  return (
                    <article
                      key={appointment.id}
                      className="p-5 transition hover:bg-gray-50/70 sm:p-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        {/* Patient details */}
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                            <UserRound size={23} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="break-words font-semibold">
                              {patient?.name || "Patient"}
                            </h3>

                            <p className="mt-1 text-xs text-gray-400">
                              Appointment ID: {appointment.id}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                              {patient?.email && (
                                <a
                                  href={`mailto:${patient.email}`}
                                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
                                >
                                  <Mail size={14} />
                                  {patient.email}
                                </a>
                              )}

                              {patient?.phone ? (
                                <a
                                  href={`tel:${patient.phone}`}
                                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
                                >
                                  <Phone size={14} />
                                  {patient.phone}
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                                  <Phone size={14} />
                                  Phone number not provided
                                </span>
                              )}
                            </div>

                            {(patient?.emergencyContactName ||
                              patient?.emergencyContactPhone) && (
                              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                                  Emergency contact
                                </p>

                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                  {patient.emergencyContactName && (
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                      <UserRound
                                        size={15}
                                        className="shrink-0 text-gray-500"
                                      />
                                      <span>
                                        {patient.emergencyContactName}
                                      </span>
                                    </div>
                                  )}

                                  {patient.emergencyContactPhone && (
                                    <a
                                      href={`tel:${patient.emergencyContactPhone}`}
                                      className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-black"
                                    >
                                      <Phone
                                        size={15}
                                        className="shrink-0 text-gray-500"
                                      />
                                      <span>
                                        {patient.emergencyContactPhone}
                                      </span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {appointment.reason && (
                              <p className="mt-3 text-sm text-gray-500">
                                <span className="font-medium text-gray-700">
                                  Reason:{" "}
                                </span>
                                {appointment.reason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Appointment time and status */}
                        <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                            <CalendarDays size={19} className="text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500">
                                Appointment date
                              </p>
                              <p className="mt-1 text-sm font-semibold">
                                {formatAppointmentDate(
                                  appointment.appointmentDate,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                            <Clock3 size={19} className="text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500">
                                Appointment time
                              </p>
                              <p className="mt-1 text-sm font-semibold">
                                {formatAppointmentTime(appointment.startTime)}
                                {" – "}
                                {formatAppointmentTime(appointment.endTime)}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-inset ${
                              statusStyles[status] ??
                              "bg-gray-100 text-gray-700 ring-gray-500/20"
                            }`}
                          >
                            {status === "cancelled" || status === "rejected" ? (
                              <XCircle size={14} />
                            ) : status === "completed" ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <Activity size={14} />
                            )}
                            {formatStatus(appointment.status)}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-gray-400">
          Patient information is private. Access is restricted to appointments
          available to the authenticated doctor.
        </p>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          {icon}
        </div>
      </div>
    </div>
  );
}
