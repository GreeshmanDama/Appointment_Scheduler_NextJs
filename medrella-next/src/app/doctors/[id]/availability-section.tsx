"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  X,
} from "lucide-react";

import api from "@/lib/axios";

interface AvailabilitySlot {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
}

interface AvailabilityResponse {
  success: boolean;
  slots: AvailabilitySlot[];
  message?: string;
}

interface BookingResponse {
  success: boolean;
  message: string;
  appointment?: {
    id: string;
    status: string;
    reason: string;
    availabilityId: string;
  };
}

interface DoctorAvailabilityProps {
  doctorId: string;
}

function getIndiaDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);

  return [
    result.getUTCFullYear(),
    String(result.getUTCMonth() + 1).padStart(2, "0"),
    String(result.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function timeLabel(value: string): string {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  const hour = hours % 12 || 12;
  const period = hours >= 12 ? "PM" : "AM";

  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
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

export default function DoctorAvailability({
  doctorId,
}: DoctorAvailabilityProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedSlot, setSelectedSlot] =
    useState<AvailabilitySlot | null>(null);
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const loadAvailability = useCallback(async () => {
    try {
      const from = getIndiaDateString();
      const to = addDays(from, 60);

      const response = await api.get<AvailabilityResponse>(
        `/doctors/${doctorId}/availability`,
        { params: { from, to } },
      );

      setSlots(response.data.slots ?? []);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    const callLoadAvailability = () => {
      void loadAvailability();
    }
    callLoadAvailability()
  }, [loadAvailability]);

  function openBookingDialog(slot: AvailabilitySlot) {
    setSelectedSlot(slot);
    setReason("");
    setBookingError("");
    setSuccess("");
  }

  function closeBookingDialog() {
    if (booking) return;

    setSelectedSlot(null);
    setReason("");
    setBookingError("");
  }

  async function handleBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingError("");
    setSuccess("");

    if (!selectedSlot) {
      setBookingError("Please select an appointment slot.");
      return;
    }

    const trimmedReason = reason.trim();

    if (trimmedReason.length < 5) {
      setBookingError("Please describe your reason in at least 5 characters.");
      return;
    }

    if (trimmedReason.length > 1000) {
      setBookingError("Your reason must not exceed 1000 characters.");
      return;
    }

    setBooking(true);

    try {
      const response = await api.post<BookingResponse>("/appointments", {
        availabilityId: selectedSlot.id,
        reason: trimmedReason,
      });

      setSlots((current) =>
        current.filter((slot) => slot.id !== selectedSlot.id),
      );

      setSelectedSlot(null);
      setReason("");
      setSuccess(
        response.data.message ||
          "Your appointment request has been submitted.",
      );
    } catch (err) {
      setBookingError(getErrorMessage(err));
    } finally {
      setBooking(false);
    }
  }

  const slotsByDate = slots.reduce<Record<string, AvailabilitySlot[]>>(
    (groups, slot) => {
      (groups[slot.slotDate] ??= []).push(slot);
      return groups;
    },
    {},
  );

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <CalendarDays size={24} />
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Available appointments
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Select a convenient consultation time and tell the doctor what you
            would like help with.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError("");
            void loadAvailability();
          }}
          disabled={loading}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {success && (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Booking submitted</p>
            <p className="mt-1">{success}</p>
            <p className="mt-1 text-xs">
              Check your appointments page for the current status.
            </p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
          <LoaderCircle size={20} className="animate-spin text-teal-700" />
          Loading available appointments...
        </div>
      )}

      {!loading && !error && slots.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <CalendarDays size={30} className="mx-auto mb-3 text-slate-400" />
          <h3 className="font-semibold text-slate-800">
            No available slots
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            There are currently no available appointments for this doctor in
            the next 60 days. Please check again later.
          </p>
        </div>
      )}

      {!loading && !error && slots.length > 0 && (
        <div className="mt-7 space-y-5">
          {Object.entries(slotsByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, daySlots]) => (
              <div
                key={date}
                className="rounded-2xl border border-slate-200 p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                    <CalendarDays size={19} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {dateLabel(date)}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {daySlots.length}{" "}
                      {daySlots.length === 1 ? "time slot" : "time slots"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {daySlots
                    .slice()
                    .sort((a, b) =>
                      a.startTime.localeCompare(b.startTime),
                    )
                    .map((slot) => (
                      <div
                        key={slot.id}
                        className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <Clock3 size={17} className="text-emerald-700" />
                          <span>
                            {timeLabel(slot.startTime)} –{" "}
                            {timeLabel(slot.endTime)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openBookingDialog(slot)}
                          className="inline-flex w-full items-center justify-center rounded-lg bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-700/20"
                        >
                          Book appointment
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Booking dialog */}
      {selectedSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeBookingDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <div className="mb-3 inline-flex rounded-xl bg-teal-50 p-2.5 text-teal-700">
                  <CalendarDays size={21} />
                </div>
                <h3
                  id="booking-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Book an appointment
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Confirm the time and provide a reason for your visit.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBookingDialog}
                disabled={booking}
                aria-label="Close booking dialog"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBooking} className="space-y-5 p-5 sm:p-6">
              <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-800">
                  Selected appointment
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {dateLabel(selectedSlot.slotDate)}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                  <Clock3 size={16} />
                  {timeLabel(selectedSlot.startTime)} –{" "}
                  {timeLabel(selectedSlot.endTime)}
                </p>
              </div>

              <div>
                <label
                  htmlFor="appointment-reason"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Reason for appointment
                  <span className="ml-1 text-rose-600">*</span>
                </label>

                <textarea
                  id="appointment-reason"
                  required
                  minLength={5}
                  maxLength={1000}
                  rows={4}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setBookingError("");
                  }}
                  placeholder="Briefly describe your symptoms or why you would like to consult the doctor..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                />

                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                  <span>Please do not include unnecessary sensitive details.</span>
                  <span className="shrink-0">
                    {reason.length}/1000
                  </span>
                </div>
              </div>

              {bookingError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                >
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <p>{bookingError}</p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeBookingDialog}
                  disabled={booking}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={booking || reason.trim().length < 5}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {booking && (
                    <LoaderCircle size={17} className="animate-spin" />
                  )}
                  {booking ? "Submitting..." : "Confirm booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}