import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { patients, users } from "@/db/schema";

export async function getAllPatients() {
  return db
    .select({
      id: patients.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isVerfied: patients.isVerified,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      address: patients.address,
      emergencyContactName: patients.emergencyContactName,
      emergencyContactPhone: patients.emergencyContactPhone,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .innerJoin(users, eq(patients.userId, users.id))
    .where(eq(users.role, "patient"))
    .orderBy(desc(patients.createdAt));
}