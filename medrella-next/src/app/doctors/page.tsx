"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseMedical,
  GraduationCap,
  Search,
  Stethoscope,
  UserRound,
  HeartPulse,
  Activity,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

import specializationData from "@/data/doctor-specializations.json";
import api from "@/lib/axios";

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

interface DoctorsResponse {
  success: boolean;
  doctors: Doctor[];
  message?: string;
}

interface SpecializationInfo {
  title: string;
  description: string;
  conditions: string[];
  whenToVisit: string;
}

const specializationGuide = specializationData as Record<
  string,
  SpecializationInfo
>;

function getSpecializationInfo(
  specialization?: string | null,
): SpecializationInfo | undefined {
  const normalizedSpecialization = specialization?.trim().toLowerCase();

  if (!normalizedSpecialization) return undefined;

  const entry = Object.entries(specializationGuide).find(
    ([key, value]) =>
      key.trim().toLowerCase() === normalizedSpecialization ||
      value.title.trim().toLowerCase() === normalizedSpecialization,
  );

  return entry?.[1];
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchDoctors() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get<DoctorsResponse>("/doctors");

        if (!cancelled) {
          setDoctors(response.data.doctors ?? []);
        }
      } catch (err: unknown) {
        if (cancelled) return;

        const responseData =
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof err.response === "object" &&
          err.response !== null &&
          "data" in err.response
            ? err.response.data
            : null;

        const message =
          typeof responseData === "object" &&
          responseData !== null &&
          "message" in responseData
            ? String(responseData.message)
            : "Unable to load doctors. Please try again.";

        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchDoctors();

    return () => {
      cancelled = true;
    };
  }, []);

  const specializations = useMemo(
    () =>
      Array.from(
        new Set(
          doctors
            .map((doctor) => doctor.specialization?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [doctors],
  );

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const doctorSpecialization = doctor.specialization?.trim() ?? "";
      const guide = getSpecializationInfo(doctorSpecialization);

      const searchableText = [
        doctor.name,
        doctor.specialization,
        doctor.qualification,
        guide?.title,
        guide?.description,
        guide?.whenToVisit,
        ...(guide?.conditions ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);

      const matchesSpecialization =
        specialization === "all" || doctorSpecialization === specialization;

      return matchesSearch && matchesSpecialization;
    });
  }, [doctors, search, specialization]);

  const activeDoctorCount = doctors.filter((doctor) => doctor.isActive).length;

  function clearFilters() {
    setSearch("");
    setSpecialization("all");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/patient/dashboard" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-black text-white">
              <Stethoscope size={23} />
            </div>

            <div>
              <span className="block text-xl font-bold tracking-tight">
                Medrella
              </span>
              <span className="text-xs text-gray-500">
                Healthcare, made simpler
              </span>
            </div>
          </Link>

          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium transition hover:border-gray-400 hover:bg-gray-50 sm:px-4"
          >
            <BriefcaseMedical size={16} />
            <span>My appointments</span>
          </Link>
        </header>

        {/* Hero */}
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-black px-6 py-9 text-white sm:px-10 sm:py-12 lg:px-12">
          <div className="pointer-events-none absolute -right-12 -top-20 size-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-10 size-52 rounded-full border border-white/10" />

          <div className="relative max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300">
              <HeartPulse size={14} />
              Find care that fits your needs
            </div>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              The right doctor
              <br />
              makes a difference.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-gray-300 sm:text-base">
              Discover our medical professionals, understand what they treat,
              compare their qualifications, and find the right care for you.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
                <UserRound size={18} className="text-gray-300" />
                <div>
                  <p className="text-lg font-semibold">
                    {loading ? "—" : activeDoctorCount}
                  </p>
                  <p className="text-xs text-gray-400">Active doctors</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
                <ShieldCheck size={18} className="text-gray-300" />
                <div>
                  <p className="text-sm font-semibold">Informed choices</p>
                  <p className="text-xs text-gray-400">Know your specialist</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search and filters */}
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Find your doctor
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Search by name, specialty, condition, or qualification.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_250px_auto]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="e.g. heart disease, Dr. Kumar..."
                aria-label="Search doctors"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:bg-white focus:ring-2 focus:ring-gray-100"
              />
            </div>

            <select
              value={specialization}
              onChange={(event) => setSpecialization(event.target.value)}
              aria-label="Filter by specialization"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-gray-500 focus:bg-white"
            >
              <option value="all">All specializations</option>

              {specializations.map((item) => (
                <option key={item} value={item}>
                  {getSpecializationInfo(item)?.title ?? item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!search && specialization === "all"}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={15} />
              Reset
            </button>
          </div>

          {(search || specialization !== "all") && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>Active filters:</span>

              {search && (
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">
                  Search: {search}
                </span>
              )}

              {specialization !== "all" && (
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">
                  {getSpecializationInfo(specialization)?.title ??
                    specialization}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Doctor results */}
        <section>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Our doctors
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Explore specialties, experience, and areas of care.
              </p>
            </div>

            {!loading && !error && (
              <span className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600">
                {filteredDoctors.length}{" "}
                {filteredDoctors.length === 1 ? "doctor" : "doctors"}
              </span>
            )}
          </div>

          {/* Loading skeletons */}
          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6"
                >
                  <div className="flex gap-3">
                    <div className="size-14 rounded-2xl bg-gray-200" />
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-4 w-2/3 rounded bg-gray-200" />
                      <div className="h-3 w-1/2 rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="mt-6 h-16 rounded-xl bg-gray-100" />
                  <div className="mt-5 h-14 rounded-xl bg-gray-100" />
                  <div className="mt-6 h-11 rounded-xl bg-gray-200" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Activity size={25} />
              </div>

              <h3 className="mt-4 text-lg font-semibold">
                Could not load doctors
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Try again
              </button>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                <Search size={24} />
              </div>

              <h3 className="mt-4 text-lg font-semibold">No doctors found</h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                Try another search term or choose a different specialization to
                find the right doctor.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                <RotateCcw size={15} />
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredDoctors.map((doctor) => {
                const info = getSpecializationInfo(doctor.specialization);

                return (
                  <article
                    key={doctor.id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg"
                  >
                    {/* Doctor identity */}
                    <div className="p-5 pb-4 sm:p-6 sm:pb-4">
                      <div className="flex items-start gap-4">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gray-100 transition group-hover:bg-gray-200">
                          <UserRound size={27} className="text-gray-700" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-lg font-semibold tracking-tight">
                            Dr. {doctor.name}
                          </h3>

                          <p className="mt-1 text-sm font-medium text-gray-600">
                            {info?.title ?? doctor.specialization}
                          </p>

                          <span
                            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                              doctor.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                doctor.isActive
                                  ? "bg-emerald-500"
                                  : "bg-gray-400"
                              }`}
                            />
                            {doctor.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Specialty information */}
                    <div className="mx-5 rounded-xl bg-gray-50 p-4 sm:mx-6">
                      <div className="mb-2 flex items-center gap-2">
                        <Stethoscope
                          size={16}
                          className="shrink-0 text-gray-500"
                        />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Areas of care
                        </h4>
                      </div>

                      <p className="text-sm leading-6 text-gray-600">
                        {info?.description ??
                          "Consult this doctor for specialist medical assessment and care."}
                      </p>

                      {info?.conditions && info.conditions.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-semibold text-gray-700">
                            Common conditions
                          </p>

                          <div className="flex flex-wrap gap-1.5">
                            {info.conditions.slice(0, 3).map((condition) => (
                              <span
                                key={condition}
                                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs leading-4 text-gray-600"
                              >
                                {condition}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {info?.whenToVisit && (
                        <div className="mt-4 border-t border-gray-200 pt-3">
                          <p className="text-xs font-semibold text-gray-700">
                            When to visit
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            {info.whenToVisit}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Qualifications and experience */}
                    <div className="flex-1 space-y-4 px-5 py-5 sm:px-6">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                          <GraduationCap size={18} className="text-gray-600" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Qualification</p>
                          <p className="mt-1 break-words text-sm font-medium leading-5 text-gray-800">
                            {doctor.qualification || "Not specified"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                          <BriefcaseMedical
                            size={17}
                            className="text-gray-600"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">
                            Clinical experience
                          </p>
                          <p className="mt-1 text-sm font-medium text-gray-800">
                            {doctor.experienceYears}{" "}
                            {doctor.experienceYears === 1 ? "year" : "years"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Profile action */}
                    <div className="mt-auto border-t border-gray-100 p-5 sm:px-6">
                      <Link
                        href={`/doctors/${doctor.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                      >
                        View profile & availability
                        <ArrowRight
                          size={16}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Patient guidance */}
        {!loading && !error && filteredDoctors.length > 0 && (
          <p className="mt-8 text-center text-xs leading-5 text-gray-500">
            Specialty descriptions are provided for general guidance. Consult a
            qualified healthcare professional for medical advice.
          </p>
        )}
      </div>
    </main>
  );
}
