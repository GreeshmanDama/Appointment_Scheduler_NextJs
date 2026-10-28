"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  UserRound,
  FileText,
  XCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
} from "lucide-react";

import api from "@/lib/axios";

type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

interface Appointment {
  id: string;
  status: AppointmentStatus;
  reason: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  doctorName: string;
  doctorCode: string;
  specialization: string;
  doctorEmail?: string | null;
  doctorPhone?: string | null;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}

type StatusFilter = "all" | AppointmentStatus;

const statusStyles: Record<AppointmentStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  completed: "border-blue-200 bg-blue-50 text-blue-700",
  no_show: "border-slate-200 bg-slate-100 text-slate-600",
};

function formatStatus(status: AppointmentStatus) {
  return status
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string) {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatTime(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})/);

  if (!match) return time;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const loadAppointments = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/appointments/my");
      const data = response.data;

      if (data.success === false) {
        throw new Error(data.message || "Unable to load appointments.");
      }

      const rows = Array.isArray(data)
        ? data
        : (data.appointments ?? data.data ?? []);

      setAppointments(rows);
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };

      setError(
        apiError.response?.data?.message ||
          apiError.message ||
          "Unable to load your appointments. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const callloadAppointments = () => {
      void loadAppointments();
    };

    callloadAppointments();
  }, [loadAppointments]);

  const counts = useMemo(
    () => ({
      all: appointments.length,
      pending: appointments.filter((a) => a.status === "pending").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
    }),
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return appointments
      .filter((appointment) => {
        const matchesFilter = filter === "all" || appointment.status === filter;

        const matchesSearch =
          !query ||
          [
            appointment.doctorName,
            appointment.specialization,
            appointment.doctorCode,
            appointment.reason ?? "",
            appointment.status,
          ].some((value) => value.toLowerCase().includes(query));

        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = `${a.appointmentDate}T${a.startTime}`;
        const dateB = `${b.appointmentDate}T${b.startTime}`;
        return dateB.localeCompare(dateA);
      });
  }, [appointments, filter, search]);

  function cancelAppointment(appointment: Appointment) {
    if (
      appointment.status !== "pending" &&
      appointment.status !== "confirmed"
    ) {
      return;
    }

    setCancellationReason("");
    setError("");
    setMessage("");
    setCancelTarget(appointment);
  }

  async function confirmCancellation() {
    if (!cancelTarget || cancellingId) return;

    const reason = cancellationReason.trim();

    if (reason.length < 3 || reason.length > 500) {
      setError("Please enter a reason between 3 and 500 characters.");
      return;
    }

    const appointment = cancelTarget;

    setCancellingId(appointment.id);
    setError("");
    setMessage("");

    try {
      await api.post(`/appointments/${appointment.id}/cancel`, {
        cancellationReason: reason,
      });

      setCancelTarget(null);
      setCancellationReason("");
      setMessage("Your appointment was cancelled successfully.");

      await loadAppointments(true);
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };

      setError(
        apiError.response?.data?.message ||
          apiError.message ||
          "Could not cancel the appointment. Please try again.",
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Patient portal
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              My Appointments
            </h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              View your bookings and manage your upcoming consultations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAppointments(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => void loadAppointments()}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {message}
            <button
              type="button"
              onClick={() => setMessage("")}
              className="ml-auto text-emerald-700"
              aria-label="Dismiss message"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {(
            [
              ["all", "All appointments", ClipboardList],
              ["pending", "Pending", Clock3],
              ["confirmed", "Confirmed", CheckCircle2],
              ["completed", "Completed", CalendarDays],
              ["cancelled", "Cancelled", XCircle],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              type="button"
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-2xl border p-4 text-left transition ${
                filter === key
                  ? "border-teal-300 bg-teal-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 sm:text-sm">
                  {label}
                </span>
                <Icon className="h-4 w-4 text-teal-700" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {counts[key]}
              </p>
            </button>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Your bookings
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredAppointments.length} appointment
                {filteredAppointments.length === 1 ? "" : "s"} found
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search doctor or reason..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
                <CalendarDays className="h-7 w-7 text-teal-700" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {appointments.length === 0
                  ? "No appointments yet"
                  : "No matching appointments"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {appointments.length === 0
                  ? "Your doctor bookings will appear here once you schedule an appointment."
                  : "Try another search term or choose a different status filter."}
              </p>
              {appointments.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                  className="mt-4 text-sm font-semibold text-teal-700 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 p-5 md:grid-cols-2">
              {filteredAppointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="flex flex-col rounded-2xl border border-slate-200 p-5 transition hover:border-teal-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                        <UserRound className="h-6 w-6 text-teal-700" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-900">
                          Dr. {appointment.doctorName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {appointment.specialization}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Doctor ID: {appointment.doctorCode}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[appointment.status] ?? statusStyles.pending}`}
                    >
                      {formatStatus(appointment.status)}
                    </span>
                  </div>

                  <div className="my-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                    <div className="flex items-start gap-2.5">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                      <div>
                        <p className="text-xs text-slate-500">
                          Appointment date
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatDate(appointment.appointmentDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                      <div>
                        <p className="text-xs text-slate-500">Time</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatTime(appointment.startTime)} –{" "}
                          {formatTime(appointment.endTime)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Reason for visit
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
                          {appointment.reason || "No reason provided"}
                        </p>
                      </div>
                    </div>

                    {appointment.cancellationReason && (
                      <div className="rounded-lg bg-red-50 p-3">
                        <p className="text-xs font-semibold text-red-700">
                          Cancellation reason
                        </p>
                        <p className="mt-1 text-sm text-red-700">
                          {appointment.cancellationReason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400">
                      Booking ID: {appointment.id.slice(0, 8)}
                    </p>

                    {(appointment.status === "pending" ||
                      appointment.status === "confirmed") && (
                      <button
                        type="button"
                        onClick={() => void cancelAppointment(appointment)}
                        disabled={cancellingId === appointment.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        {cancellingId === appointment.id
                          ? "Cancelling..."
                          : "Cancel appointment"}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          If you need to cancel, please do so as early as possible. A
          cancellation is complete only after the server confirms the request.
        </p>
      </div>

      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !cancellingId) {
              setCancelTarget(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>

              <div>
                <h2
                  id="cancel-dialog-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Cancel appointment?
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Dr. {cancelTarget.doctorName}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(cancelTarget.appointmentDate)} ·{" "}
                  {formatTime(cancelTarget.startTime)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label
                htmlFor="cancellation-reason"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Reason for cancellation
                <span className="ml-1 text-red-600">*</span>
              </label>

              <textarea
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
                placeholder="Please tell us why you need to cancel..."
                rows={4}
                maxLength={500}
                required
                disabled={cancellingId !== null}
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
              />

              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Please enter at least 3 characters.
                </p>
                <span className="text-xs text-slate-400">
                  {cancellationReason.length}/500
                </span>
              </div>

              {error && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={cancellingId !== null}
                onClick={() => {
                  setCancelTarget(null);
                  setCancellationReason("");
                  setError("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Keep appointment
              </button>

              <button
                type="button"
                disabled={
                  cancellingId !== null || cancellationReason.trim().length < 3
                }
                onClick={() => void confirmCancellation()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancellingId === cancelTarget.id ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Confirm cancellation"
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
