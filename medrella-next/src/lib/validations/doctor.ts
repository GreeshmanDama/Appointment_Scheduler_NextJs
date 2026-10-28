import { z } from "zod";

const cleanName = z
  .string()
  .transform((v) => v.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(3, "Name must contain 3–50 characters.")
      .max(50, "Name must contain 3–50 characters."),
  );

const doctorCode = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .pipe(
    z
      .string()
      .min(3, "Doctor code must be 3–30 characters.")
      .max(30, "Doctor code must be 3–30 characters.")
      .regex(
        /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
        "Doctor code may contain only letters, numbers and single hyphens, e.g. DOC-1001.",
      ),
  );

export const createDoctorSchema = z.object({
  name: cleanName,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(255),
  password: z
    .string()
    .min(8, "Password must contain at least 8 characters.")
    .refine(
      (v) => new TextEncoder().encode(v).length <= 72,
      "Password must be at most 72 UTF-8 bytes.",
    ),
  phone: z
    .string()
    .trim()
    .min(1, "Phone must contain 1–20 characters when provided.")
    .max(20, "Phone must contain 1–20 characters when provided.")
    .nullish(),
  doctorCode,
  specialization: z
    .string()
    .trim()
    .min(2, "Specialization must contain 2–100 characters.")
    .max(100, "Specialization must contain 2–100 characters."),
  qualification: z
    .string()
    .trim()
    .min(2, "Qualification must contain 2–200 characters.")
    .max(200, "Qualification must contain 2–200 characters."),
  experienceYears: z
    .number({ message: "Experience must be an integer between 0 and 60." })
    .int("Experience must be an integer between 0 and 60.")
    .min(0, "Experience must be an integer between 0 and 60.")
    .max(60, "Experience must be an integer between 0 and 60."),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
