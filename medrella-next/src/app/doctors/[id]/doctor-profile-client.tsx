"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseMedical,
  GraduationCap,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";

import api from "@/lib/axios";
import DoctorAvailability from "./availability-section";

interface Doctor {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  doctorCode: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  createdAt: string;
}

interface DoctorResponse {
  success: boolean;
  doctor: Doctor;
  message?: string;
}

interface DoctorProfileClientProps {
  id: string;
}

export default function DoctorProfileClient({
  id,
}: DoctorProfileClientProps) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchDoctor() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get<DoctorResponse>(`/doctors/${id}`);

        if (!cancelled) {
          setDoctor(response.data.doctor);
        }
      } catch (err: unknown) {
        if (cancelled) return;

        const message =
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof err.response === "object" &&
          err.response !== null &&
          "data" in err.response &&
          typeof err.response.data === "object" &&
          err.response.data !== null &&
          "message" in err.response.data
            ? String(err.response.data.message)
            : "Unable to load this doctor's profile.";

        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (id) {
      void fetchDoctor();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading && id) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="mb-8 h-5 w-40 rounded bg-gray-200" />
          <div className="h-64 rounded-3xl bg-gray-200" />
          <div className="mt-6 h-48 rounded-2xl bg-gray-200" />
        </div>
      </main>
    );
  }

  if (!id || error || !doctor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <Stethoscope size={36} className="mx-auto mb-4 text-gray-400" />

          <h1 className="text-xl font-semibold">Unable to load doctor</h1>

          <p className="mt-2 text-sm text-gray-500">
            {!id
              ? "Invalid doctor ID."
              : error || "This doctor could not be found."}
          </p>

          <Link
            href="/doctors"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <ArrowLeft size={16} />
            Browse doctors
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between">
          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-black"
          >
            <ArrowLeft size={17} />
            Back to doctors
          </Link>

          <Link
            href="/appointments"
            className="text-sm font-medium text-gray-600 hover:text-black"
          >
            My appointments
          </Link>
        </header>

        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="bg-black px-6 py-10 text-white sm:px-10 sm:py-12">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex size-24 shrink-0 items-center justify-center rounded-3xl bg-white/10">
                <UserRound size={46} />
              </div>

              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-200">
                  <ShieldCheck size={14} />
                  Verified profile
                </div>

                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Dr. {doctor.name}
                </h1>

                <p className="mt-2 text-gray-300">
                  {doctor.specialization}
                </p>

                <p className="mt-3 text-sm text-gray-400">
                  Doctor ID: {doctor.doctorCode}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-10">
            <div className="flex gap-4 rounded-2xl bg-gray-50 p-5">
              <GraduationCap
                size={23}
                className="shrink-0 text-gray-500"
              />

              <div>
                <p className="text-sm text-gray-500">Qualifications</p>
                <p className="mt-1 font-semibold">
                  {doctor.qualification || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl bg-gray-50 p-5">
              <BriefcaseMedical
                size={23}
                className="shrink-0 text-gray-500"
              />

              <div>
                <p className="text-sm text-gray-500">Clinical experience</p>
                <p className="mt-1 font-semibold">
                  {doctor.experienceYears}{" "}
                  {doctor.experienceYears === 1 ? "year" : "years"}
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl bg-gray-50 p-5">
              <Mail size={22} className="shrink-0 text-gray-500" />

              <div className="min-w-0">
                <p className="text-sm text-gray-500">Contact email</p>
                <p className="mt-1 break-all font-medium">
                  {doctor.email}
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl bg-gray-50 p-5">
              <Phone size={22} className="shrink-0 text-gray-500" />

              <div>
                <p className="text-sm text-gray-500">Contact number</p>
                {doctor.phone ? (
                  <a
                    href={`tel:${doctor.phone}`}
                    className="mt-1 inline-block font-medium hover:underline"
                  >
                    {doctor.phone}
                  </a>
                ) : (
                  <p className="mt-1 font-medium">Not provided</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Load and display the doctor's published availability */}
        <DoctorAvailability doctorId={doctor.id} />

        <div className="mt-6">
          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-gray-50"
          >
            View my appointments
          </Link>
        </div>
      </div>
    </main>
  );
}