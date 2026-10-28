"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { UserPlus } from "lucide-react";

import api from "@/lib/axios";

const EMPTY = {
  name: "",
  email: "",
  password: "",
  phone: "",
  doctorCode: "",
  specialization: "",
  qualification: "",
  experienceYears: "0",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10";

export function CreateDoctorForm() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post("/admin/create-doctor", {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone.trim() || undefined,
        doctorCode: form.doctorCode,
        specialization: form.specialization,
        qualification: form.qualification,
        experienceYears: Number(form.experienceYears),
      });

      setSuccess(`Doctor account created for ${form.name.trim()}.`);
      setForm(EMPTY);
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;

      setError(message || "Unable to create the doctor account.");
    } finally {
      setLoading(false);
    }
  };

  const field = (
    name: keyof typeof EMPTY,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        value={form[name]}
        onChange={handleChange}
        className={inputClass}
        {...props}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {field("name", "Full name", { placeholder: "Dr. Priya Sharma", required: true })}
        {field("email", "Email address", {
          type: "email",
          placeholder: "doctor@clinic.com",
          autoComplete: "off",
          required: true,
        })}
        {field("password", "Temporary password", {
          type: "password",
          placeholder: "At least 8 characters",
          autoComplete: "new-password",
          required: true,
        })}
        {field("phone", "Phone (optional)", { type: "tel", placeholder: "+91 98765 43210" })}
        {field("doctorCode", "Doctor code", { placeholder: "DOC-1001", required: true })}
        {field("specialization", "Specialization", { placeholder: "Cardiology", required: true })}
        {field("qualification", "Qualification", { placeholder: "MBBS, MD", required: true })}
        {field("experienceYears", "Years of experience", {
          type: "number",
          min: 0,
          max: 60,
          required: true,
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Creating...
          </>
        ) : (
          <>
            <UserPlus size={17} />
            Create doctor account
          </>
        )}
      </button>
    </form>
  );
}
