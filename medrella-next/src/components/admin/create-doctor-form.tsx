"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreatedDoctor {
  id: string;
  doctorCode: string;
  name: string;
  email: string;
  phone: string | null;
  specialization: string;
  qualification: string;
  experienceYears: number;
}

interface CreateDoctorResponse {
  success: boolean;
  message?: string;
  doctor?: CreatedDoctor;
}

interface CreateDoctorFormProps {
  /** Called after a doctor is created, e.g. to refresh a table */
  onCreated?: (doctor: CreatedDoctor) => void;
}

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  doctorCode: "",
  specialization: "",
  qualification: "",
  experienceYears: "0",
};

export function CreateDoctorForm({ onCreated }: CreateDoctorFormProps) {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
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

    const experienceYears = Number(form.experienceYears);

    if (!Number.isInteger(experienceYears)) {
      setError("Experience must be a whole number of years.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post<CreateDoctorResponse>(
        "/admin/create-doctor",
        {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone.trim() || undefined,
          doctorCode: form.doctorCode,
          specialization: form.specialization,
          qualification: form.qualification,
          experienceYears,
        },
      );

      if (!data.success || !data.doctor) {
        throw new Error(data.message || "Unable to create doctor.");
      }

      setSuccess(
        `Doctor account created for ${data.doctor.name} (${data.doctor.doctorCode}).`,
      );
      setForm(initialForm);
      setShowPassword(false);
      onCreated?.(data.doctor);
      router.refresh();
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : err instanceof Error
            ? err.message
            : undefined;

      setError(message || "Unable to create doctor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus size={20} />
          Add a doctor
        </CardTitle>
        <CardDescription>
          Creates a doctor account the doctor can use to sign in to the doctor
          portal.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Dr. Priya Sharma"
                minLength={3}
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctorCode">Doctor code</Label>
              <Input
                id="doctorCode"
                name="doctorCode"
                value={form.doctorCode}
                onChange={handleChange}
                placeholder="DOC-1001"
                minLength={3}
                maxLength={30}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={handleChange}
                placeholder="doctor@clinic.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                maxLength={20}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password">Temporary password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  minLength={8}
                  maxLength={72}
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                name="specialization"
                value={form.specialization}
                onChange={handleChange}
                placeholder="Cardiology"
                minLength={2}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experienceYears">Experience (years)</Label>
              <Input
                id="experienceYears"
                name="experienceYears"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                step={1}
                value={form.experienceYears}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="qualification">Qualification</Label>
              <Input
                id="qualification"
                name="qualification"
                value={form.qualification}
                onChange={handleChange}
                placeholder="MBBS, MD"
                minLength={2}
                maxLength={200}
                required
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {success}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Creating...
              </>
            ) : (
              "Create doctor"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}