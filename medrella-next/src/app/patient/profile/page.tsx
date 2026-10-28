
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartPulse,
  LogOut,
  Mail,
  Pencil,
  Save,
  ShieldCheck,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";

import api from "@/lib/axios";
import { useUser } from "@/components/providers/user-provider";

interface PatientProfile {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  isVerified: boolean;
}

interface ProfileFormValues {
  name: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const EMPTY_FORM: ProfileFormValues = {
  name: "",
  email: "",
  phone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

export default function PatientProfilePage() {
  const user = useUser();
  const router = useRouter();

  const [form, setForm] = useState<ProfileFormValues>({
    ...EMPTY_FORM,
    name: user.name ?? "",
    email: user.email ?? "",
  });

  const [originalForm, setOriginalForm] =
    useState<ProfileFormValues>(form);

  const [isVerified, setIsVerified] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const name = form.name.trim() || "Patient";
  const email = form.email || "No email available";
  const role = user.role || "patient";

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  function updateField(
    field: keyof ProfileFormValues,
    value: string,
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setIsLoading(true);
      setError("");

      try {
        const response = await api.get("/patient/profile");

        const profile: PatientProfile =
          response.data.patient ??
          response.data.profile ??
          response.data;

        if (!active) return;

        const loadedForm: ProfileFormValues = {
          name: profile.name ?? user.name ?? "",
          email: profile.email ?? user.email ?? "",
          phone: profile.phone ?? "",
          emergencyContactName:
            profile.emergencyContactName ?? "",
          emergencyContactPhone:
            profile.emergencyContactPhone ?? "",
        };

        setForm(loadedForm);
        setOriginalForm(loadedForm);
        setIsVerified(profile.isVerified === true);
      } catch (err) {
        console.error("Failed to load patient profile:", err);

        if (active) {
          setError(
            "Unable to load your profile details. Please refresh the page.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user.name, user.email]);

  function handleEditToggle() {
    setError("");
    setSuccess("");

    if (isEditing) {
      setForm({ ...originalForm });
      setIsEditing(false);
      return;
    }

    setOriginalForm({ ...form });
    setIsEditing(true);
  }

  async function handleProfileUpdate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleaned: ProfileFormValues = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      emergencyContactName:
        form.emergencyContactName.trim(),
      emergencyContactPhone:
        form.emergencyContactPhone.trim(),
    };

    if (!cleaned.name) {
      setError("Full name is required.");
      return;
    }

    if (cleaned.name.length > 120) {
      setError("Full name cannot exceed 120 characters.");
      return;
    }

    if (
      !cleaned.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    if (cleaned.email.length > 255) {
      setError("Email address cannot exceed 255 characters.");
      return;
    }

    if (
      cleaned.phone.length > 20 ||
      cleaned.emergencyContactPhone.length > 20
    ) {
      setError("Phone numbers cannot exceed 20 characters.");
      return;
    }

    if (cleaned.emergencyContactName.length > 120) {
      setError(
        "Emergency contact name cannot exceed 120 characters.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await api.patch("/patient/profile", cleaned);

      const updatedProfile: PatientProfile =
        response.data.patient ??
        response.data.profile ??
        response.data;

      const savedForm: ProfileFormValues = {
        name: updatedProfile.name ?? cleaned.name,
        email: updatedProfile.email ?? cleaned.email,
        phone: updatedProfile.phone ?? cleaned.phone,
        emergencyContactName:
          updatedProfile.emergencyContactName ??
          cleaned.emergencyContactName,
        emergencyContactPhone:
          updatedProfile.emergencyContactPhone ??
          cleaned.emergencyContactPhone,
      };

      setForm(savedForm);
      setOriginalForm(savedForm);

      if (typeof updatedProfile.isVerified === "boolean") {
        setIsVerified(updatedProfile.isVerified);
      } else if (
        cleaned.email.toLowerCase() !==
        originalForm.email.trim().toLowerCase()
      ) {
        setIsVerified(false);
      }

      setIsEditing(false);
      setSuccess("Your profile has been updated successfully.");
    } catch (err: unknown) {
      console.error("Profile update failed:", err);

      setError(
        (typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined) ??
          "Unable to update your profile. Please check your details and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleVerifyAccount() {
    setError("");
    setSuccess("");
    router.push("/patient/verification");
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      localStorage.removeItem("token");
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-gray-950">
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/patient/dashboard"
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-white shadow-sm">
              <HeartPulse size={21} />
            </div>

            <div>
              <p className="text-base font-bold tracking-tight">
                Medrella
              </p>
              <p className="text-[11px] font-medium tracking-wide text-gray-500">
                PATIENT PORTAL
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/patient/dashboard"
              className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 sm:inline-flex"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8">
          <Link
            href="/patient/dashboard"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950 sm:hidden"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                <UserRound size={15} />
                Account settings
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                My profile
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
                Manage your account information, emergency contact,
                and healthcare services in one place.
              </p>
            </div>

            {!isLoading && (
              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold ${
                  isVerified
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {isVerified ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <AlertCircle size={15} />
                )}
                {isVerified
                  ? "Account verified"
                  : "Verification required"}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.65fr]">
          <aside className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div className="h-24 bg-gray-950">
                <div className="h-full bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_55%)]" />
              </div>

              <div className="px-6 pb-6">
                <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gray-100 text-2xl font-semibold tracking-tight text-gray-800 shadow-sm">
                  {initials || "P"}
                </div>

                <h2 className="mt-4 break-words text-xl font-semibold tracking-tight">
                  {name}
                </h2>

                <p className="mt-1 break-all text-sm text-gray-500">
                  {email}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold capitalize text-gray-700">
                    <UserRound size={13} />
                    {role}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600">
                    <ShieldCheck size={13} />
                    {isVerified
                      ? "Verified account"
                      : "Unverified account"}
                  </span>
                </div>

                <div className="my-6 border-t border-gray-100" />

                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Quick access
                </p>

                <div className="mt-3 space-y-1">
                  <Link
                    href="/appointments"
                    className="group flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <CalendarDays size={18} className="text-gray-400" />
                      My appointments
                    </span>
                    <ChevronRight
                      size={17}
                      className="text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-900"
                    />
                  </Link>

                  <Link
                    href="/doctors"
                    className="group flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <Stethoscope size={18} className="text-gray-400" />
                      Find a doctor
                    </span>
                    <ChevronRight
                      size={17}
                      className="text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-900"
                    />
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  <ShieldCheck size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">
                    Account verification
                  </h3>

                  {isVerified ? (
                    <>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={14} />
                        Account verified
                      </div>

                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        Your account is verified.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        Verify your account to confirm your registered
                        email address.
                      </p>

                      <button
                        type="button"
                        onClick={handleVerifyAccount}
                        disabled={isLoading || isEditing}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Mail size={16} />
                        Verify account
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  <ShieldCheck size={19} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold">
                    Your privacy matters
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-gray-500">
                    Keep your account credentials private and always
                    sign out when using a shared device.
                  </p>
                </div>
              </div>
            </section>
          </aside>

          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                    <UserRound size={20} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      Personal information
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage your name, email, phone, and emergency
                      contact details.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleEditToggle}
                  disabled={isLoading || isSaving}
                  aria-label={isEditing ? "Cancel editing" : "Edit profile"}
                  title={isEditing ? "Cancel editing" : "Edit profile"}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:border-gray-400 hover:bg-gray-50 hover:text-gray-950 disabled:opacity-50"
                >
                  {isEditing ? <X size={18} /> : <Pencil size={18} />}
                </button>
              </div>

              {isLoading ? (
                <div className="mt-8 space-y-5" aria-label="Loading profile">
                  <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
                  <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                  <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                  <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                </div>
              ) : (
                <form onSubmit={handleProfileUpdate} className="mt-7">
                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="profile-name"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Full name
                      </label>

                      <input
                        id="profile-name"
                        name="name"
                        value={form.name}
                        readOnly={!isEditing}
                        required
                        maxLength={120}
                        onChange={(event) =>
                          updateField("name", event.target.value)
                        }
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                          isEditing
                            ? "border-gray-200 bg-white focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-email"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Email address
                      </label>

                      <input
                        id="profile-email"
                        name="email"
                        type="email"
                        value={form.email}
                        readOnly={!isEditing}
                        required
                        maxLength={255}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                          isEditing
                            ? "border-gray-200 bg-white focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      />
                      {isEditing && (
                        <p className="mt-1.5 text-xs text-amber-700">
                          Changing your email may require verifying
                          the new address again.
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="profile-phone"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Phone number
                      </label>

                      <input
                        id="profile-phone"
                        name="phone"
                        type="tel"
                        maxLength={20}
                        readOnly={!isEditing}
                        value={form.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                        placeholder="Enter your phone number"
                        autoComplete="tel"
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                          isEditing
                            ? "border-gray-200 bg-white focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      />
                    </div>

                    <div className="border-t border-gray-100 pt-5">
                      <h3 className="text-base font-semibold">
                        Emergency contact
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        Add someone we can contact if you need assistance.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="emergency-contact-name"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Emergency contact name
                      </label>

                      <input
                        id="emergency-contact-name"
                        name="emergencyContactName"
                        type="text"
                        maxLength={120}
                        readOnly={!isEditing}
                        value={form.emergencyContactName}
                        onChange={(event) =>
                          updateField(
                            "emergencyContactName",
                            event.target.value,
                          )
                        }
                        placeholder="Enter contact person's full name"
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                          isEditing
                            ? "border-gray-200 bg-white focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="emergency-contact-phone"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Emergency contact phone
                      </label>

                      <input
                        id="emergency-contact-phone"
                        name="emergencyContactPhone"
                        type="tel"
                        maxLength={20}
                        readOnly={!isEditing}
                        value={form.emergencyContactPhone}
                        onChange={(event) =>
                          updateField(
                            "emergencyContactPhone",
                            event.target.value,
                          )
                        }
                        placeholder="Enter emergency contact phone"
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                          isEditing
                            ? "border-gray-200 bg-white focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      />
                    </div>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                      <AlertCircle size={17} className="mt-0.5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  {success && (
                    <div
                      role="status"
                      className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                    >
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                      <p>{success}</p>
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={handleEditToggle}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        <X size={16} />
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Save size={16} />
                        {isSaving ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  )}
                </form>
              )}
            </section>

            <section className="rounded-3xl bg-gray-950 p-6 text-white shadow-sm sm:p-8">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div className="max-w-lg">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                    <HeartPulse size={22} />
                  </div>

                  <h2 className="mt-5 text-xl font-semibold tracking-tight sm:text-2xl">
                    Take charge of your health
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Find a specialist, book a consultation, and keep
                    track of your upcoming healthcare visits.
                  </p>
                </div>

                <Link
                  href="/doctors"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-200"
                >
                  Explore doctors
                  <ArrowRight size={17} />
                </Link>
              </div>

              <div className="mt-7 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4">
                  <CalendarDays size={19} className="shrink-0 text-gray-300" />

                  <div>
                    <p className="text-sm font-medium">Appointments</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Review your visits
                    </p>
                  </div>

                  <Link
                    href="/appointments"
                    aria-label="View appointments"
                    className="ml-auto rounded-lg p-2 transition hover:bg-white/10"
                  >
                    <ArrowRight size={16} />
                  </Link>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4">
                  <Clock3 size={19} className="shrink-0 text-gray-300" />

                  <div>
                    <p className="text-sm font-medium">Plan your next visit</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Choose a suitable doctor
                    </p>
                  </div>

                  <Link
                    href="/doctors"
                    aria-label="Find a doctor"
                    className="ml-auto rounded-lg p-2 transition hover:bg-white/10"
                  >
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="mt-10 border-t border-gray-200 pt-5 text-center text-xs text-gray-400">
          Medrella Patient Portal · Your healthcare, thoughtfully organized.
        </footer>
      </main>
    </div>
  );
}
