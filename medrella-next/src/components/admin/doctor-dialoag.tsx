"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  X,
  UserRound,
  Mail,
  BriefcaseMedical,
  GraduationCap,
  Check,
  Phone,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

type DoctorForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  doctorCode: string;
  specialization: string;
  qualification: string;
  experienceYears: string;
};

const emptyDoctorForm: DoctorForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  doctorCode: "",
  specialization: "",
  qualification: "",
  experienceYears: "0",
};

type DoctorDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

export function DoctorDialog({ open, onClose, onCreated }: DoctorDialogProps) {
  const [form, setForm] = useState<DoctorForm>(emptyDoctorForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    setForm(emptyDoctorForm);
    setError("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose, saving]);

  if (!open) return null;

  const updateField = (field: keyof DoctorForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const years = Number(form.experienceYears);

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.doctorCode.trim() ||
      !form.specialization.trim() ||
      !form.qualification.trim()
    ) {
      setError("Please fill in all required doctor fields.");
      return;
    }

    if (form.password.length < 8 || form.password.length > 72) {
      setError("The password must contain between 8 and 72 characters.");
      return;
    }

    if (!Number.isInteger(years) || years < 0 || years > 70) {
      setError("Experience must be a whole number between 0 and 70.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/create-doctor", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          Phone: form.phone ?? undefined,
          password: form.password,
          doctorCode: form.doctorCode.trim(),
          specialization: form.specialization.trim(),
          qualification: form.qualification.trim(),
          experienceYears: years,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ?? `Failed to create doctor (${response.status}).`,
        );
      }

      await onCreated();
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

  const iconInputClass =
    "w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 font-normal outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

  const labelClass = "space-y-2 text-sm font-medium text-slate-700";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-modal-title"
        className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Plus size={20} />
            </div>

            <h3 id="doctor-modal-title" className="text-xl font-bold">
              Create doctor account
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create a login account and assign the doctor&apos;s clinic
              details.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <label className={labelClass}>
              Full name *
              <span className="relative block">
                <UserRound
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  required
                  maxLength={100}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Dr. Jane Smith"
                  className={iconInputClass}
                />
              </span>
            </label>

            <label className={labelClass}>
              Email address *
              <span className="relative block">
                <Mail
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  required
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="doctor@clinic.com"
                  className={iconInputClass}
                />
              </span>
            </label>

            <label className={labelClass}>
              Phone number *
              <span className="relative block">
                <Phone
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+91 9876543210"
                  className={iconInputClass}
                />
              </span>
            </label>

            <label className={`${labelClass} sm:col-span-2`}>
              Initial password *
              <input
                required
                type="password"
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
              <span className="block text-xs font-normal text-slate-500">
                Share initial credentials securely. The backend must hash this
                password before storing it.
              </span>
            </label>

            <label className={labelClass}>
              Doctor ID / Code *
              <input
                required
                maxLength={40}
                value={form.doctorCode}
                onChange={(e) => updateField("doctorCode", e.target.value)}
                placeholder="DOC-1001"
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Specialization *
              <span className="relative block">
                <BriefcaseMedical
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  required
                  maxLength={100}
                  value={form.specialization}
                  onChange={(e) =>
                    updateField("specialization", e.target.value)
                  }
                  placeholder="Cardiology"
                  className={iconInputClass}
                />
              </span>
            </label>

            <label className={labelClass}>
              Qualification *
              <span className="relative block">
                <GraduationCap
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  required
                  maxLength={150}
                  value={form.qualification}
                  onChange={(e) => updateField("qualification", e.target.value)}
                  placeholder="MBBS, MD"
                  className={iconInputClass}
                />
              </span>
            </label>

            <label className={labelClass}>
              Years of experience *
              <input
                required
                type="number"
                min={0}
                max={70}
                step={1}
                value={form.experienceYears}
                onChange={(e) => updateField("experienceYears", e.target.value)}
                className={inputClass}
              />
            </label>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              disabled={saving}
              onClick={handleClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check size={17} />
                  Create doctor
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
