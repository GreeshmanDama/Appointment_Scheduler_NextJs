"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import api from "@/lib/axios";

type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

type FilterStatus = "all" | AppointmentStatus;
type AppointmentAction = "confirmed" | "cancelled";

interface Appointment {
  id: string;
  status: AppointmentStatus;
  reason: string | null;
  cancellationReason: string | null;
  cancelledAt?: string | null;
  createdAt: string;

  patient: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };

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

const statusStyles: Record<AppointmentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  completed: "bg-sky-50 text-sky-700 ring-sky-200",
  no_show: "bg-slate-100 text-slate-600 ring-slate-200",
};

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Awaiting decision",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No show",
};

const filters: FilterStatus[] = [
  "all",
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function formatTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;

  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getErrorMessage(error: unknown): string {
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

  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  // The same dialog handles pending rejections and confirmed cancellations.
  const [cancellationTarget, setCancellationTarget] =
    useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const loadAppointments = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const callloadAppointments = () => {
      void loadAppointments();
    };
    callloadAppointments();
  }, [loadAppointments]);

  function closeCancellationDialog() {
    if (actionId !== null) return;

    setCancellationTarget(null);
    setCancellationReason("");
    setError("");
  }

  function updateStatus(appointment: Appointment, status: AppointmentAction) {
    setError("");
    setNotice("");

    if (actionId !== null) return;

    if (status === "cancelled") {
      if (
        appointment.status !== "pending" &&
        appointment.status !== "confirmed"
      ) {
        return;
      }

      setCancellationReason("");
      setCancellationTarget(appointment);
      return;
    }

    if (appointment.status !== "pending") return;

    void confirmAppointment(appointment);
  }

  async function confirmAppointment(appointment: Appointment) {
    if (actionId !== null || appointment.status !== "pending") return;

    setActionId(appointment.id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch(
        `/doctor/appointments/${appointment.id}/status`,
        { status: "confirmed" },
      );

      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id ? { ...item, status: "confirmed" } : item,
        ),
      );

      setNotice(
        response.data?.message ?? "Appointment confirmed successfully.",
      );

      await loadAppointments(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function confirmCancellation() {
    if (!cancellationTarget || actionId !== null) return;

    const reason = cancellationReason.trim();

    if (reason.length < 3 || reason.length > 500) {
      setError("Please enter a reason between 3 and 500 characters.");
      return;
    }

    const appointment = cancellationTarget;

    // Avoid submitting an action against a stale appointment status.
    if (
      appointment.status !== "pending" &&
      appointment.status !== "confirmed"
    ) {
      setError("This appointment can no longer be cancelled.");
      return;
    }

    const wasConfirmed = appointment.status === "confirmed";

    setActionId(appointment.id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch(
        `/doctor/appointments/${appointment.id}/status`,
        {
          status: "cancelled",
          cancellationReason: reason,
        },
      );

      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id
            ? {
                ...item,
                status: "cancelled",
                cancellationReason: reason,
              }
            : item,
        ),
      );

      setCancellationTarget(null);
      setCancellationReason("");

      setNotice(
        response.data?.message ??
          (wasConfirmed
            ? "Confirmed appointment cancelled successfully."
            : "Appointment request rejected successfully."),
      );

      await loadAppointments(true);
    } catch (err: unknown) {
      // Keep the dialog open so the doctor can retry if appropriate.
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return appointments
      .filter((appointment) =>
        filter === "all" ? true : appointment.status === filter,
      )
      .filter((appointment) => {
        if (!query) return true;

        return [
          appointment.patient.name ?? "",
          appointment.patient.email ?? "",
          appointment.patient.phone ?? "",
          appointment.reason ?? "",
        ].some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (b.status === "pending" && a.status !== "pending") return 1;

        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [appointments, filter, search]);

  const pendingCount = appointments.filter(
    (item) => item.status === "pending",
  ).length;

  const confirmedCount = appointments.filter(
    (item) => item.status === "confirmed",
  ).length;

  const completedCount = appointments.filter(
    (item) => item.status === "completed",
  ).length;

  const isConfirmedCancellation = cancellationTarget?.status === "confirmed";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
              <Stethoscope size={14} />
              DOCTOR PORTAL
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Appointments
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Review patient requests, confirm consultations, and manage your
              appointment schedule.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAppointments(true)}
            disabled={refreshing || loading || actionId !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total appointments"
            value={appointments.length}
            description="All requests and consultations"
            icon={<CalendarDays size={21} />}
          />
          <StatCard
            label="Pending requests"
            value={pendingCount}
            description="Waiting for your decision"
            icon={<Clock3 size={21} />}
            accent="amber"
          />
          <StatCard
            label="Confirmed"
            value={confirmedCount}
            description="Scheduled consultations"
            icon={<CheckCircle2 size={21} />}
            accent="green"
          />
          <StatCard
            label="Completed"
            value={completedCount}
            description="Finished consultations"
            icon={<Stethoscope size={21} />}
            accent="blue"
          />
        </section>

        {/* Errors from loading or accepting appear here.
            Cancellation errors are shown inside the open dialog. */}
        {error && !cancellationTarget && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p>{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="ml-auto"
              aria-label="Dismiss notification"
            >
              <XCircle size={17} />
            </button>
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Patient requests</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review appointment details and take action.
                </p>
              </div>

              <div className="relative w-full lg:max-w-xs">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search patients or reason..."
                  aria-label="Search appointments"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {filters.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                    filter === value
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {value === "all" ? "All" : statusLabels[value]}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <LoaderCircle size={28} className="animate-spin text-teal-700" />
              <p className="mt-3 text-sm">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <CalendarDays size={34} className="mx-auto text-slate-300" />
              <h3 className="mt-4 font-semibold text-slate-800">
                No appointments found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {filter === "pending"
                  ? "You have no pending requests right now."
                  : "Try changing your filters or search terms."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAppointments.map((appointment) => {
                const isPending = appointment.status === "pending";
                const isConfirmed = appointment.status === "confirmed";
                const isWorking = actionId === appointment.id;

                return (
                  <article
                    key={appointment.id}
                    className="p-4 transition hover:bg-slate-50/70 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                            <UserRound size={21} />
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900">
                              {appointment.patient.name || "Unknown patient"}
                            </h3>

                            <p className="mt-0.5 text-xs text-slate-500">
                              Patient ID: {appointment.patient.id}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[appointment.status]}`}
                          >
                            {statusLabels[appointment.status]}
                          </span>
                        </div>

                        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                          <InfoItem
                            icon={<CalendarDays size={17} />}
                            label="Appointment date"
                            value={formatDate(appointment.appointmentDate)}
                          />
                          <InfoItem
                            icon={<Clock3 size={17} />}
                            label="Consultation time"
                            value={`${formatTime(appointment.startTime)} – ${formatTime(appointment.endTime)}`}
                          />
                          <h3 className="font-bold text-slate-900">
                            {appointment.patient.name || "Unknown patient"}
                          </h3>

                          <p className="mt-0.5 text-xs text-slate-500">
                            Patient ID: {appointment.patient.id}
                          </p>
                        </div>

                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Patient&apos;s reason for visit
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {appointment.reason?.trim() ||
                              "No reason provided."}
                          </p>
                        </div>

                        {appointment.status === "cancelled" &&
                          appointment.cancellationReason && (
                            <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800">
                              <p className="font-semibold">
                                Cancellation / rejection reason
                              </p>
                              <p className="mt-1 whitespace-pre-wrap">
                                {appointment.cancellationReason}
                              </p>
                            </div>
                          )}
                      </div>

                      {(isPending || isConfirmed) && (
                        <div className="flex w-full flex-col gap-2 xl:w-48">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={actionId !== null}
                                onClick={() =>
                                  updateStatus(appointment, "confirmed")
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isWorking ? (
                                  <LoaderCircle
                                    size={17}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <CheckCircle2 size={17} />
                                )}
                                Accept request
                              </button>

                              <button
                                type="button"
                                disabled={actionId !== null}
                                onClick={() =>
                                  updateStatus(appointment, "cancelled")
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <XCircle size={17} />
                                Reject request
                              </button>
                            </>
                          )}

                          {isConfirmed && (
                            <button
                              type="button"
                              disabled={actionId !== null}
                              onClick={() =>
                                updateStatus(appointment, "cancelled")
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <XCircle size={17} />
                              Cancel appointment
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && appointments.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:px-6">
              Showing {filteredAppointments.length} of {appointments.length}{" "}
              appointments
            </div>
          )}
        </section>
      </div>

      {/* Shared dialog for pending rejection and confirmed cancellation */}
      {cancellationTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && actionId === null) {
              closeCancellationDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancellation-dialog-title"
            aria-describedby="cancellation-dialog-description"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50">
                <XCircle className="h-6 w-6 text-rose-600" />
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  id="cancellation-dialog-title"
                  className="text-xl font-bold text-slate-900"
                >
                  {isConfirmedCancellation
                    ? "Cancel confirmed appointment?"
                    : "Reject appointment request?"}
                </h2>

                <p
                  id="cancellation-dialog-description"
                  className="mt-1 text-sm leading-5 text-slate-500"
                >
                  {isConfirmedCancellation
                    ? "This will cancel the scheduled consultation."
                    : "This will reject the patient's appointment request."}
                </p>

                <p className="mt-3 text-sm font-semibold text-slate-800">
                  {cancellationTarget.patient.name || "Unknown patient"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(cancellationTarget.appointmentDate)}
                  {" · "}
                  {formatTime(cancellationTarget.startTime)}
                  {" – "}
                  {formatTime(cancellationTarget.endTime)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCancellationDialog}
                disabled={actionId !== null}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6">
              <label
                htmlFor="doctor-cancellation-reason"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                {isConfirmedCancellation
                  ? "Reason for cancellation"
                  : "Reason for rejection"}
                <span className="ml-1 text-rose-600">*</span>
              </label>

              <textarea
                id="doctor-cancellation-reason"
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
                placeholder={
                  isConfirmedCancellation
                    ? "Explain why you need to cancel this appointment..."
                    : "Explain why you cannot accept this request..."
                }
                rows={4}
                maxLength={500}
                required
                autoFocus
                disabled={actionId !== null}
                aria-invalid={
                  cancellationReason.trim().length > 0 &&
                  cancellationReason.trim().length < 3
                }
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
              />

              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Enter 3–500 characters.
                </p>
                <span className="text-xs text-slate-400">
                  {cancellationReason.length}/500
                </span>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-3 flex items-start gap-2 text-sm text-rose-600"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionId !== null}
                onClick={closeCancellationDialog}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Keep appointment
              </button>

              <button
                type="button"
                disabled={
                  actionId !== null ||
                  cancellationReason.trim().length < 3 ||
                  cancellationReason.trim().length > 500
                }
                onClick={() => void confirmCancellation()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionId === cancellationTarget.id ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin" />
                    {isConfirmedCancellation ? "Cancelling..." : "Rejecting..."}
                  </>
                ) : isConfirmedCancellation ? (
                  "Confirm cancellation"
                ) : (
                  "Confirm rejection"
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
  accent = "slate",
}: {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
  accent?: "slate" | "amber" | "green" | "blue";
}) {
  const accents = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${accents[accent]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 break-words font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
