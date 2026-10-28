import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { doctors, users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/server/services/auth.service";

export const runtime = "nodejs";

const updateDoctorSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(20),
    specialization: z.string().trim().min(2).max(120),
    qualification: z.string().trim().min(2).max(200),
    experienceYears: z.number().int().min(0).max(80),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "No fields to update.");

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> },
) {
  const session = await getSession(req);
  if (!session) return fail("Not authenticated.", 401);

  const caller = await getUserById(session.userId);
  if (!caller) return fail("Not authenticated.", 401);
  if (caller.role !== "admin") return fail("Forbidden.", 403);

  const { doctorId } = await params;
  if (!z.string().uuid().safeParse(doctorId).success) {
    return fail("Invalid doctor id.", 400);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body.", 400);
  }

  const parsed = updateDoctorSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  const { name, phone, specialization, qualification, experienceYears } =
    parsed.data;

  const [doctor] = await db
    .select({ id: doctors.id, userId: doctors.userId })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  if (!doctor) return fail("Doctor not found.", 404);

  const doctorFields = { specialization, qualification, experienceYears };

  try {
    await db.transaction(async (tx) => {
      if (Object.values(doctorFields).some((v) => v !== undefined)) {
        await tx
          .update(doctors)
          .set({ ...doctorFields, updatedAt: new Date() })
          .where(eq(doctors.id, doctorId));
      }

      if (name !== undefined || phone !== undefined) {
        await tx
          .update(users)
          .set({
            name,
            phone: phone === "" ? null : phone,
            updatedAt: new Date(),
          })
          .where(eq(users.id, doctor.userId));
      }
    });
  } catch (err) {
    console.error("Doctor update error:", err);
    return fail("Unable to update doctor.", 500);
  }

  return NextResponse.json({ success: true, message: "Doctor updated." });
}