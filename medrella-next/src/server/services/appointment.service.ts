import { alias } from "drizzle-orm/pg-core";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  appointments,
  patients,
  doctors,
  users,
  availability,
} from "@/db/schema";

const patientUsers = alias(users, "patient_users");
const doctorUsers = alias(users, "doctor_users");

export async function getAllAppointments() {
  return db
    .select({
      id: appointments.id,
      status: appointments.status,
      reason: appointments.reason,
      cancellationReason: appointments.cancellationReason,
      cancelledAt: appointments.cancelledAt,
      createdAt: appointments.createdAt,

      patientId: patients.id,
      patientName: patientUsers.name,
      patientEmail: patientUsers.email,
      patientPhone: patientUsers.phone,

      doctorId: doctors.id,
      doctorName: doctorUsers.name,
      doctorCode: doctors.doctorCode,
      specialization: doctors.specialization,
      isActive: doctors.isActive,

      availabilityId: availability.id,
      appointmentDate: availability.slotDate,
      startTime: availability.startTime,
      endTime: availability.endTime,
    })
    .from(appointments)
    .innerJoin(
      patients,
      eq(appointments.patientId, patients.id),
    )
    .innerJoin(
      patientUsers,
      eq(patients.userId, patientUsers.id),
    )
    .innerJoin(
      doctors,
      eq(appointments.doctorId, doctors.id),
    )
    .innerJoin(
      doctorUsers,
      eq(doctors.userId, doctorUsers.id),
    )
    .innerJoin(
      availability,
      eq(appointments.availabilityId, availability.id),
    )
    .orderBy(desc(appointments.createdAt));
}