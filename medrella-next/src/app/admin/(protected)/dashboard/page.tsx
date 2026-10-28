"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  Clock3,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
  UserRound,
  ArrowUpRight,
  Plus,
  Check,
  Pencil,
  Save,
} from "lucide-react";

import { DoctorDialog } from "@/components/admin/doctor-dialoag";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useUser } from "@/components/providers/user-provider";
import api from "@/lib/axios";

type Section = "overview" | "doctors" | "appointments" | "patients";

type Doctor = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  doctorCode?: string;
  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  isActive?: boolean;
};

type Patient = {
  id: string;
  name: string;
  email: string;
  phone: number;
  createdAt?: string;
  isVerfied?: string | null;
};

type Appointment = {
  id: string;
  patientName?: string;
  doctorName?: string;
  startAt?: string;
  appointmentDate?: string;
  status: string;
};

type Stats = {
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  pendingAppointments: number;
};

const emptyStats: Stats = {
  totalDoctors: 0,
  totalPatients: 0,
  totalAppointments: 0,
  pendingAppointments: 0,
};

const navigation: {
  id: Section;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "patients", label: "Patients", icon: Users },
];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const style = ["active", "confirmed", "completed", "verified"].includes(
    normalized,
  )
    ? "bg-emerald-50 text-emerald-700"
    : ["inactive", "cancelled", "canceled", "rejected"].includes(normalized)
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {status}
    </span>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight">
            {value.toLocaleString("en-IN")}
          </p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>

        <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message ?? `Request failed (${response.status})`);
  }

  return result as T;
}

function extractList<T>(result: unknown, key: string): T[] {
  if (!result || typeof result !== "object") return [];

  const data = result as Record<string, unknown>;
  const nested = data.data;

  if (Array.isArray(data[key])) return data[key] as T[];

  if (Array.isArray(nested)) return nested as T[];

  if (nested && typeof nested === "object") {
    const nestedData = nested as Record<string, unknown>;
    if (Array.isArray(nestedData[key])) {
      return nestedData[key] as T[];
    }
  }

  return [];
}

function normalizeDoctor(doctor: Record<string, unknown>): Doctor {
  const user =
    doctor.user && typeof doctor.user === "object"
      ? (doctor.user as Record<string, unknown>)
      : doctor.userId && typeof doctor.userId === "object"
        ? (doctor.userId as Record<string, unknown>)
        : {};

  return {
    id: String(doctor.id ?? doctor._id ?? ""),
    name: String(doctor.name ?? user.name ?? "Unnamed doctor"),
    email: String(doctor.email ?? user.email ?? "—"),
    phone: String(doctor.phone ?? user.phone ?? ""),
    doctorCode: String(doctor.doctorCode ?? ""),
    specialization: String(doctor.specialization ?? ""),
    qualification: String(doctor.qualification ?? ""),
    experienceYears: Number(doctor.experienceYears ?? 0),
    isActive: Boolean(doctor.isActive ?? true),
  };
}

export default function AdminDashboard() {
  const user = useUser();
  const firstName = user.name.trim().split(/\s+/)[0] || "Admin";

  const [section, setSection] = useState<Section>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [appointmentFilter, setAppointmentFilter] = useState("all");

  const [stats, setStats] = useState<Stats>(emptyStats);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [success, setSuccess] = useState("");

  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    specialization: "",
    qualification: "",
    experienceYears: 0,
  });
  const [savingDoctor, setSavingDoctor] = useState(false);

  const openEditDoctor = (doctor: Doctor) => {
    setError("");
    setSuccess("");
    setEditingDoctor(doctor);

    setEditForm({
      name: doctor.name === "Unnamed doctor" ? "" : doctor.name,
      phone: doctor.phone ?? "",
      specialization: doctor.specialization ?? "",
      qualification: doctor.qualification ?? "",
      experienceYears: doctor.experienceYears ?? 0,
    });
  };

  const closeEditDoctor = () => {
    if (savingDoctor) return;
    setEditingDoctor(null);
  };

  const handleEditDoctor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingDoctor || savingDoctor) return;

    setError("");
    setSuccess("");

    try {
      setSavingDoctor(true);

      await api.patch(`/admin/doctors/${editingDoctor.id}`, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        specialization: editForm.specialization.trim(),
        qualification: editForm.qualification.trim(),
        experienceYears: Number(editForm.experienceYears),
      });

      setEditingDoctor(null);
      setSuccess("Doctor details updated successfully.");

      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingDoctor(false);
    }
  };

  const openCreateDoctor = () => {
    setError("");
    setSuccess("");
    setDoctorModalOpen(true);
  };

  const closeCreateDoctor = () => {
    setDoctorModalOpen(false);
  };

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      if (section === "overview") {
        const results = await Promise.allSettled([
          api.get("/admin/dashboard/stats"),
          api.get("/admin/get-doctors"),
          api.get("/admin/get-appointments"),
        ]);

        const failed = results.some((result) => result.status === "rejected");

        if (results[0].status === "fulfilled") {
          const response = results[0].value as {
            data?: {
              success?: boolean;
              stats?: Stats;
              data?: Stats;
            };
            stats?: Stats;
          };

          const payload = response.data ?? response;
          const raw = (payload.stats ?? payload.data) as Stats | undefined;

          if (raw) {
            setStats({
              totalDoctors: Number(raw.totalDoctors ?? 0),
              totalPatients: Number(raw.totalPatients ?? 0),
              totalAppointments: Number(raw.totalAppointments ?? 0),
              pendingAppointments: Number(raw.pendingAppointments ?? 0),
            });
          }
        }

        if (results[1].status === "fulfilled") {
          setDoctors(
            extractList<Record<string, unknown>>(
              results[1].value,
              "doctors",
            ).map(normalizeDoctor),
          );
        }

        if (results[2].status === "fulfilled") {
          setAppointments(
            extractList<Appointment>(results[2].value, "appointments"),
          );
        }

        if (failed) {
          throw new Error(
            "Some dashboard data could not be loaded. Verify that the admin API routes exist.",
          );
        }
      } else if (section === "doctors") {
        const result = await api.get("/admin/get-doctors");

        setDoctors(
          extractList<Record<string, unknown>>(result, "doctors").map(
            normalizeDoctor,
          ),
        );
      } else if (section === "patients") {
        const result = await api.get("/admin/get-patients");

        setPatients(extractList<Patient>(result, "patients"));
      } else {
        const result = await api.get("/admin/get-appointments");

        setAppointments(extractList<Appointment>(result, "appointments"));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [section]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredDoctors = useMemo(() => {
    const term = search.trim().toLowerCase();

    return doctors.filter((doctor) =>
      [doctor.name, doctor.email, doctor.doctorCode, doctor.specialization]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [doctors, search]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();

    return patients.filter((patient) =>
      `${patient.name} ${patient.email}`.toLowerCase().includes(term),
    );
  }, [patients, search]);

  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const matchesStatus =
        appointmentFilter === "all" ||
        appointment.status.toLowerCase() === appointmentFilter;

      const matchesSearch =
        `${appointment.patientName ?? ""} ${appointment.doctorName ?? ""} ${appointment.status}`
          .toLowerCase()
          .includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [appointments, appointmentFilter, search]);

  const changeSection = (next: Section) => {
    setSection(next);
    setSearch("");
    setMobileNavOpen(false);
    setError("");
    setSuccess("");
  };

  const activeNav = navigation.find((item) => item.id === section);

  return (
    <>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {mobileNavOpen && (
          <button
            aria-label="Close navigation overlay"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-700 text-white">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Medrella</h1>
              <p className="text-xs text-slate-500">Clinic administration</p>
            </div>
            <button
              className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
            >
              <X size={19} />
            </button>
          </div>

          <div className="px-4 pt-7">
            <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => changeSection(id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${
                    section === id
                      ? "bg-teal-50 text-teal-800"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={19} />
                  {label}
                  {section === id && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-teal-600" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4">
            <div className="mb-4 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={18} className="text-teal-700" />
                Administrator
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Manage clinic accounts and appointments securely.
              </p>
            </div>
          </div>

          <DashboardHeader
            portalLabel="Admin portal"
            homeHref="/admin/dashboard"
            loginPath="/admin/login"
          />
        </aside>

        <div className="min-h-screen lg:pl-72">
          <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={21} />
              </button>

              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  Medrella / Administration
                </p>
                <h2 className="mt-1 truncate text-lg font-bold">
                  {activeNav?.label ?? "Overview"}
                </h2>
              </div>
            </div>

            <button
              onClick={() => void refresh()}
              disabled={refreshing || loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </header>

          <main className="mx-auto max-w-[1600px] p-4 sm:p-8">
            {error && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
              >
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                <p className="flex-1">{error}</p>
                <button onClick={() => setError("")} aria-label="Dismiss error">
                  <X size={17} />
                </button>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
              >
                <Check size={18} />

                <p className="flex-1">{success}</p>

                <button
                  onClick={() => setSuccess("")}
                  aria-label="Dismiss success message"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            {section === "overview" && (
              <div className="space-y-8">
                <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
                  <p className="text-sm font-medium text-teal-300">
                    ADMINISTRATOR WORKSPACE
                  </p>

                  <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        Welcome back, {firstName}.
                      </h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                        Manage your medical team, monitor appointments, and keep
                        clinic operations organized.
                      </p>
                    </div>

                    <button
                      onClick={openCreateDoctor}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
                    >
                      <Plus size={18} />
                      Add a doctor
                    </button>
                  </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Total doctors"
                    value={stats.totalDoctors}
                    description="Registered medical professionals"
                    icon={Stethoscope}
                  />
                  <MetricCard
                    title="Total patients"
                    value={stats.totalPatients}
                    description="Patient accounts"
                    icon={Users}
                  />
                  <MetricCard
                    title="Appointments"
                    value={stats.totalAppointments}
                    description="Appointments across the clinic"
                    icon={CalendarDays}
                  />
                  <MetricCard
                    title="Pending appointments"
                    value={stats.pendingAppointments}
                    description="Require attention"
                    icon={Clock3}
                  />
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold">Doctor directory</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Recently added doctors
                        </p>
                      </div>
                      <button
                        onClick={() => changeSection("doctors")}
                        className="text-sm font-semibold text-teal-700"
                      >
                        View all
                      </button>
                    </div>

                    <div className="mt-5 divide-y divide-slate-100">
                      {doctors.slice(0, 5).map((doctor) => (
                        <div
                          key={doctor.id}
                          className="flex items-center gap-3 py-4 first:pt-0"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Stethoscope size={19} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {doctor.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {doctor.specialization ||
                                "Specialization not set"}
                            </p>
                          </div>
                          <StatusBadge
                            status={doctor.isActive ? "Active" : "Inactive"}
                          />
                        </div>
                      ))}

                      {!loading && doctors.length === 0 && (
                        <p className="py-8 text-center text-sm text-slate-500">
                          No doctors found.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h3 className="font-bold">Quick actions</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Common administration tasks
                    </p>

                    {[
                      {
                        label: "Manage doctors",
                        text: "Review doctor accounts and professional details",
                        icon: Stethoscope,
                        target: "doctors" as Section,
                      },
                      {
                        label: "Review appointments",
                        text: "Inspect bookings and appointment statuses",
                        icon: CalendarDays,
                        target: "appointments" as Section,
                      },
                      {
                        label: "Browse patients",
                        text: "Find registered patient accounts",
                        icon: Users,
                        target: "patients" as Section,
                      },
                    ].map(({ label, text, icon: Icon, target }) => (
                      <button
                        key={target}
                        onClick={() => changeSection(target)}
                        className="mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-teal-300 hover:bg-teal-50/50"
                      >
                        <span className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
                          <Icon size={19} />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold">
                            {label}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {text}
                          </span>
                        </span>
                        <ArrowUpRight size={17} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">Recent appointments</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Latest appointment activity
                      </p>
                    </div>
                    <button
                      onClick={() => changeSection("appointments")}
                      className="text-sm font-semibold text-teal-700"
                    >
                      View all
                    </button>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Patient</th>
                          <th className="px-4 py-3">Doctor</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {appointments.slice(0, 5).map((appointment) => (
                          <tr key={appointment.id}>
                            <td className="px-4 py-4 font-medium">
                              {appointment.patientName ?? "—"}
                            </td>
                            <td className="px-4 py-4">
                              {appointment.doctorName ?? "—"}
                            </td>
                            <td className="px-4 py-4">
                              {formatDate(
                                appointment.startAt ??
                                  appointment.appointmentDate,
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <StatusBadge status={appointment.status} />
                            </td>
                          </tr>
                        ))}

                        {!loading && appointments.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-8 text-center text-slate-500"
                            >
                              No appointments found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <button
                  onClick={openCreateDoctor}
                  className="mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/50"
                >
                  <span className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
                    <Plus size={19} />
                  </span>

                  <span className="flex-1">
                    <span className="block text-sm font-semibold">
                      Create doctor account
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Assign credentials and professional details
                    </span>
                  </span>

                  <ArrowUpRight size={17} className="text-slate-400" />
                </button>
              </div>
            )}

            {section === "doctors" && (
              <section className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <h3 className="text-lg font-bold">Doctor management</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Search registered doctors and review their details.
                  </p>
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search name, email, ID, specialization..."
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[750px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Doctor</th>
                        <th className="px-6 py-4">Doctor ID</th>
                        <th className="px-6 py-4">Specialization</th>
                        <th className="px-6 py-4">Qualification</th>
                        <th className="px-6 py-4">Experience</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDoctors.map((doctor) => (
                        <tr key={doctor.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <p className="font-semibold">{doctor.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {doctor.email}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            {doctor.doctorCode || "—"}
                          </td>
                          <td className="px-6 py-4">
                            {doctor.specialization || "—"}
                          </td>
                          <td className="px-6 py-4">
                            {doctor.qualification || "—"}
                          </td>
                          <td className="px-6 py-4">
                            {doctor.experienceYears ?? 0} years
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              status={doctor.isActive ? "Active" : "Inactive"}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => openEditDoctor(doctor)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                            >
                              <Pencil size={15} />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!loading && filteredDoctors.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-12 text-center text-slate-500"
                          >
                            No doctors found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {section === "appointments" && (
              <section className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <h3 className="text-lg font-bold">Appointment management</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Review appointments and filter by status.
                  </p>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Search patient or doctor..."
                      />
                    </div>
                    <select
                      value={appointmentFilter}
                      onChange={(event) =>
                        setAppointmentFilter(event.target.value)
                      }
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <option value="all">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Patient</th>
                        <th className="px-6 py-4">Doctor</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAppointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td className="px-6 py-4 font-semibold">
                            {appointment.patientName ?? "—"}
                          </td>
                          <td className="px-6 py-4">
                            {appointment.doctorName ?? "—"}
                          </td>
                          <td className="px-6 py-4">
                            {formatDate(
                              appointment.startAt ??
                                appointment.appointmentDate,
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={appointment.status} />
                          </td>
                        </tr>
                      ))}
                      {!loading && filteredAppointments.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-12 text-center text-slate-500"
                          >
                            No appointments match your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {section === "patients" && (
              <section className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <h3 className="text-lg font-bold">Patient management</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Search patient accounts and review verification status.
                  </p>
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search patient name or email..."
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Patient</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Joined</th>
                        <th className="px-6 py-4">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPatients.map((patient) => (
                        <tr key={patient.id}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <UserRound size={19} className="text-slate-400" />
                              <span className="font-semibold">
                                {patient.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">{patient.email}</td>
                          <td className="px-6 py-4">
                            {patient.phone}
                          </td>
                          <td className="px-6 py-4">
                            {formatDate(patient.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              status={
                                patient.isVerfied ? "Verified" : "Pending"
                              }
                            />
                          </td>
                        </tr>
                      ))}
                      {!loading && filteredPatients.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-12 text-center text-slate-500"
                          >
                            No patients found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <RefreshCw size={16} className="animate-spin" />
                Loading dashboard data…
              </div>
            )}

            <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row">
              <p>Medrella Administration</p>
              <p>Authorized staff only · Protect patient information</p>
            </footer>
          </main>
        </div>
      </div>
      <DoctorDialog
        open={doctorModalOpen}
        onClose={closeCreateDoctor}
        onCreated={async () => {
          await loadData();
          setSuccess("Doctor account created successfully.");
        }}
      />
      {editingDoctor && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditDoctor();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-doctor-title"
            className="my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <h2
                  id="edit-doctor-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Edit doctor
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update professional and contact information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditDoctor}
                disabled={savingDoctor}
                aria-label="Close edit doctor dialog"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleEditDoctor} className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-doctor-name"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Full name
                  </label>
                  <input
                    id="edit-doctor-name"
                    required
                    minLength={2}
                    maxLength={120}
                    value={editForm.name}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-doctor-phone"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Phone number
                  </label>
                  <input
                    id="edit-doctor-phone"
                    type="tel"
                    maxLength={10}
                    value={editForm.phone}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="Enter phone number"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-doctor-specialization"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Specialization
                  </label>
                  <input
                    id="edit-doctor-specialization"
                    required
                    minLength={2}
                    maxLength={120}
                    value={editForm.specialization}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        specialization: event.target.value,
                      }))
                    }
                    placeholder="e.g. Cardiology"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-doctor-qualification"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Qualification
                  </label>
                  <input
                    id="edit-doctor-qualification"
                    required
                    minLength={2}
                    maxLength={200}
                    value={editForm.qualification}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        qualification: event.target.value,
                      }))
                    }
                    placeholder="e.g. MBBS, MD"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-doctor-experience"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Experience (years)
                  </label>
                  <input
                    id="edit-doctor-experience"
                    type="number"
                    required
                    min={0}
                    max={80}
                    step={1}
                    value={editForm.experienceYears}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        experienceYears:
                          event.target.value === ""
                            ? 0
                            : Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditDoctor}
                  disabled={savingDoctor}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingDoctor ||
                    editForm.name.trim().length < 2 ||
                    editForm.specialization.trim().length < 2 ||
                    editForm.qualification.trim().length < 2 ||
                    !Number.isInteger(editForm.experienceYears) ||
                    editForm.experienceYears < 0 ||
                    editForm.experienceYears > 80
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingDoctor ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mt-5 max-w-xl">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
    </div>
  );
}
