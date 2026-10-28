"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  Stethoscope,
  CalendarCheck,
  ArrowRight,
  Trash2,
} from "lucide-react";

import api from "@/lib/axios";

type SlotStatus = "available" | "booked" | "blocked";
type Period = "AM" | "PM";

interface AvailabilitySlot {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
}

interface AvailabilityResponse {
  success: boolean;
  slots: AvailabilitySlot[];
  message?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const STATUS_CLASS: Record<SlotStatus, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  booked: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  blocked: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10";

function getIndiaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

function todayInIndia(): string {
  const { year, month, day } = getIndiaDateParts();

  return `${year}-${month}-${day}`;
}

function addDaysToDateString(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);

  return [
    result.getUTCFullYear(),
    String(result.getUTCMonth() + 1).padStart(2, "0"),
    String(result.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function currentTimeInIndiaMinutes(): number {
  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

  return timeToMinutes(currentTime);
}

function timeLabel(value: string): string {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;

  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function dateLabel(value: string): string {
  const date = new Date(`${value}T12:00:00.000Z`);

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function to12Hour(value: string): {
  hour: number;
  minute: number;
  period: Period;
} {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);

  return {
    hour: hours % 12 || 12,
    minute: minutes,
    period: hours >= 12 ? "PM" : "AM",
  };
}

function to24Hour(hour: number, minute: number, period: Period): string {
  let hours = hour % 12;

  if (period === "PM") {
    hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;

    if (
      typeof response === "object" &&
      response !== null &&
      "data" in response &&
      typeof response.data === "object" &&
      response.data !== null &&
      "message" in response.data
    ) {
      return String(response.data.message);
    }
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { hour, minute, period } = to12Hour(value);

  return (
    <label className="block min-w-0 space-y-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Clock3 size={16} className="text-teal-700" />
        {label}
      </span>

      <div className="grid grid-cols-3 gap-2">
        <select
          aria-label={`${label} hour`}
          value={hour}
          onChange={(event) =>
            onChange(to24Hour(Number(event.target.value), minute, period))
          }
          className={selectClass}
        >
          {HOURS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          aria-label={`${label} minute`}
          value={minute}
          onChange={(event) =>
            onChange(to24Hour(hour, Number(event.target.value), period))
          }
          className={selectClass}
        >
          {MINUTES.map((item) => (
            <option key={item} value={item}>
              {String(item).padStart(2, "0")}
            </option>
          ))}
        </select>

        <select
          aria-label={`${label} AM or PM`}
          value={period}
          onChange={(event) =>
            onChange(to24Hour(hour, minute, event.target.value as Period))
          }
          className={selectClass}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </label>
  );
}

function StatusBadge({ status }: { status: SlotStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${STATUS_CLASS[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "available"
            ? "bg-emerald-500"
            : status === "booked"
              ? "bg-blue-500"
              : "bg-rose-500"
        }`}
      />
      {status}
    </span>
  );
}

export default function ManageAvailabilityPage() {
  const [slotDate, setSlotDate] = useState(() => todayInIndia());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AvailabilitySlot | null>(
    null,
  );

  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    try {
      const from = todayInIndia();
      const to = addDaysToDateString(from, 60);

      const response = await api.get<AvailabilityResponse>(
        "/doctor/availability",
        {
          params: { from, to },
        },
      );

      setSlots(response.data.slots ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const callLoadSlots = () => {
      void loadSlots();
    };
    callLoadSlots();
  }, [loadSlots]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const today = todayInIndia();

    if (!slotDate) {
      setError("Please select an appointment date.");
      return;
    }

    if (slotDate < today) {
      setError("You cannot add availability for a past date.");
      return;
    }

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      setError("End time must be later than the start time.");
      return;
    }

    if (
      slotDate === today &&
      timeToMinutes(startTime) <= currentTimeInIndiaMinutes()
    ) {
      setError(
        "This start time has already passed in India. Choose a later time or another date.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await api.post("/doctor/availability", {
        slotDate,
        startTime,
        endTime,
      });

      setSuccess(response.data?.message ?? "Availability added successfully.");

      await loadSlots();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    setError("");
    await loadSlots();
  }

  const availableCount = slots.filter(
    (slot) => slot.status === "available",
  ).length;

  const bookedCount = slots.filter((slot) => slot.status === "booked").length;

  const blockedCount = slots.filter((slot) => slot.status === "blocked").length;

  function openDeleteDialog(slot: AvailabilitySlot) {
    if (slot.status === "booked") {
      setError("Booked slots cannot be deleted.");
      return;
    }

    setError("");
    setSuccess("");
    setDeleteTarget(slot);
  }

  function closeDeleteDialog() {
    if (deletingSlotId) return;

    setDeleteTarget(null);
  }

  async function confirmDeleteAvailability() {
    if (!deleteTarget || deletingSlotId) return;

    const slotId = deleteTarget.id;

    setDeletingSlotId(slotId);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/doctor/availability/${slotId}`);

      setSlots((currentSlots) =>
        currentSlots.filter((slot) => slot.id !== slotId),
      );

      setSuccess(
        response.data?.message ?? "Availability deleted successfully.",
      );

      setDeleteTarget(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingSlotId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-bold tracking-wider text-teal-800">
              <Stethoscope size={14} />
              DOCTOR PORTAL
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Manage availability
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Create and manage your consultation slots so patients know when
              they can book an appointment with you.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh slots
          </button>
        </header>

        {success && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Availability updated</p>
              <p className="mt-1 leading-5">{success}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
              className="rounded-lg p-1 text-emerald-700 transition hover:bg-emerald-100"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section
          aria-label="Availability summary"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Available slots
              </p>
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <CalendarCheck size={20} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight">
              {loading ? "—" : availableCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ready for patient bookings
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Booked slots</p>
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <CalendarDays size={20} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight">
              {loading ? "—" : bookedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Appointments already reserved
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Blocked slots
              </p>
              <span className="rounded-xl bg-rose-50 p-2.5 text-rose-700">
                <Clock3 size={20} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight">
              {loading ? "—" : blockedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Not available for booking
            </p>
          </div>
        </section>

        {/* Create availability */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
                <Plus size={22} />
              </div>

              <div>
                <h2 className="text-lg font-bold">Add a time slot</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Choose a date and define the start and end time for your
                  consultation.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block min-w-0 space-y-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarDays size={16} className="text-teal-700" />
                  Appointment date
                </span>

                <input
                  required
                  type="date"
                  min={todayInIndia()}
                  value={slotDate}
                  onChange={(event) => {
                    setSlotDate(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  className={inputClass}
                />

                <span className="block text-xs leading-5 text-slate-400">
                  Dates are evaluated using India Standard Time (IST).
                </span>
              </label>

              <TimePicker
                label="Start time"
                value={startTime}
                onChange={(value) => {
                  setStartTime(value);
                  setError("");
                  setSuccess("");
                }}
              />

              <TimePicker
                label="End time"
                value={endTime}
                onChange={(value) => {
                  setEndTime(value);
                  setError("");
                  setSuccess("");
                }}
              />
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                Slots must end after they start. Past dates and past start times
                for today cannot be added.
              </p>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-700/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <RefreshCw size={17} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                {saving ? "Saving availability..." : "Add availability"}
              </button>
            </div>
          </form>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Unable to complete the request</p>
              <p className="mt-1 leading-5">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded-lg p-1 text-rose-600 transition hover:bg-rose-100"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        )}

        {/* Upcoming slots */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <Stethoscope size={22} />
              </div>

              <div>
                <h2 className="text-lg font-bold">Your upcoming slots</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your availability over the next 60 days.
                </p>
              </div>
            </div>

            {!loading && (
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {slots.length} {slots.length === 1 ? "slot" : "slots"}
              </span>
            )}
          </div>

          <div className="p-5 sm:p-7">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <RefreshCw size={24} className="animate-spin text-teal-700" />
                <p className="mt-4 text-sm font-medium text-slate-700">
                  Loading your availability
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Please wait while we retrieve your slots.
                </p>
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                  <CalendarDays size={27} />
                </div>

                <h3 className="mt-4 font-bold text-slate-800">
                  No availability added yet
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Add your first consultation slot above. Patients will be able
                  to book from the available times.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    document
                      .querySelector("input[type='date']")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      })
                  }
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
                >
                  Create your first slot
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {slots.map((slot) => (
                  <article
                    key={slot.id}
                    className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 sm:flex">
                        <CalendarDays size={21} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {dateLabel(slot.slotDate)}
                        </p>

                        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          <Clock3 size={15} className="shrink-0" />
                          <span>{timeLabel(slot.startTime)}</span>
                          <span className="text-slate-300">to</span>
                          <span>{timeLabel(slot.endTime)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={slot.status} />

                      {slot.status !== "booked" && (
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(slot)}
                          disabled={deletingSlotId !== null}
                          aria-label={`Delete availability on ${dateLabel(slot.slotDate)}`}
                          title="Delete availability"
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          All appointment dates and times are validated against India Standard
          Time (IST).
        </p>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-availability-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Trash2 size={22} />
            </div>

            <h2
              id="delete-availability-title"
              className="mt-5 text-xl font-bold text-slate-900"
            >
              Delete availability?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to delete the slot on{" "}
              <span className="font-semibold text-slate-900">
                {dateLabel(deleteTarget.slotDate)}
              </span>{" "}
              from{" "}
              <span className="font-semibold text-slate-900">
                {timeLabel(deleteTarget.startTime)}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {timeLabel(deleteTarget.endTime)}
              </span>
              ?
            </p>

            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              Slots linked to existing appointments cannot be deleted. This
              action cannot be undone once the slot is deleted.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={deletingSlotId !== null}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Keep slot
              </button>

              <button
                type="button"
                onClick={confirmDeleteAvailability}
                disabled={deletingSlotId !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingSlotId === deleteTarget.id ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete slot
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
