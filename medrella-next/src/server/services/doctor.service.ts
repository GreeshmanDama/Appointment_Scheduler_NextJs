import { eq } from "drizzle-orm";

import { db } from "@/db";
import { doctors, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import type { CreateDoctorInput } from "@/lib/validations/doctor";
import { AuthError } from "@/server/services/auth.service";
import { randomUUID } from "node:crypto";

function uniqueViolation(err: unknown) {
  const e = err as {
    code?: string;
    constraint?: string;
    cause?: { code?: string; constraint?: string };
  };
  const code = e?.code ?? e?.cause?.code;
  if (code !== "23505") return null;
  return e?.constraint ?? e?.cause?.constraint ?? "";
}

export async function getDoctorById(id: string) {
  return db
    .select({
      id: doctors.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isActive: doctors.isActive,
      doctorCode: doctors.doctorCode,
      specialization: doctors.specialization,
      qualification: doctors.qualification,
      experienceYears: doctors.experienceYears,
      createdAt: doctors.createdAt,
    })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .where(eq(doctors.id, id))
    .limit(1);
}

export async function getAllDoctors() {
  return db
    .select({
      id: doctors.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isActive: doctors.isActive,
      doctorCode: doctors.doctorCode,
      specialization: doctors.specialization,
      qualification: doctors.qualification,
      experienceYears: doctors.experienceYears,
      createdAt: doctors.createdAt,
    })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .where(eq(users.role, "doctor"))
    .orderBy(users.name);
}

export async function createDoctor(input: CreateDoctorInput) {
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUser) {
    throw new AuthError("An account with this email already exists.", 409);
  }

  const [existingDoctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.doctorCode, input.doctorCode))
    .limit(1);

  if (existingDoctor) {
    throw new AuthError(
      "This doctor code is already assigned. Choose another code.",
      409,
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const userId = randomUUID();

    const { user, doctor } = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          id: userId,
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          passwordHash,
          role: "doctor",

        })
        .returning();

      const [doctor] = await tx
        .insert(doctors)
        .values({
          userId,
          doctorCode: input.doctorCode,
          specialization: input.specialization,
          qualification: input.qualification,
          experienceYears: input.experienceYears,
        })
        .returning();

      return { user, doctor };
    });

    return {
      id: doctor.id,
      doctorCode: doctor.doctorCode,
      name: user.name,
      email: user.email,
      phone: user.phone,
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      experienceYears: doctor.experienceYears,
    };
  } catch (err) {
    const constraint = uniqueViolation(err);

    if (constraint !== null) {
      throw new AuthError(
        constraint.includes("doctor_code")
          ? "This doctor code is already assigned."
          : constraint.includes("email")
            ? "An account with this email already exists."
            : "A record with these details already exists.",
        409,
      );
    }

    throw err;
  }
}
