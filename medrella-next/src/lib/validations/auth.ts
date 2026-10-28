import { z } from "zod";

const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.")
  .max(255, "Email address is too long.");

const passwordField = z
  .string()
  .min(8, "Your password must contain at least 8 characters.")
  .max(72, "Your password must be 72 characters or fewer.");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(120, "Name is too long."),
  email: emailField,
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "Please enter a valid phone number.")
    .optional(),
  password: passwordField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Please enter your password.").max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
