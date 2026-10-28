import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  appointments,
  patients,
  doctors,
  users,
  availability,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";

const patientUsers = alias(users, "patient_users");
const doctorUsers = alias(users, "doctor_users");

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, session.userId))
      .limit(1);

    if (!doctor) {
      return NextResponse.json(
        { success: false, message: "Doctor profile not found" },
        { status: 403 },
      );
    }

    const results = await db
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
        patientEmergencyContactName: patients.emergencyContactName,
        patientEmergencyContactPhone: patients.emergencyContactPhone,

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
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(patientUsers, eq(patients.userId, patientUsers.id))
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(doctorUsers, eq(doctors.userId, doctorUsers.id))
      .innerJoin(availability, eq(appointments.availabilityId, availability.id))
      .where(eq(appointments.doctorId, doctor.id))
      .orderBy(desc(appointments.createdAt));

    return NextResponse.json({
      success: true,
      appointments: results.map((appointment) => ({
        id: appointment.id,
        status: appointment.status,
        reason: appointment.reason,
        cancellationReason: appointment.cancellationReason,
        cancelledAt: appointment.cancelledAt,
        createdAt: appointment.createdAt,

        // Patient information
        patient: {
          id: appointment.patientId,
          name: appointment.patientName,
          email: appointment.patientEmail,
          phone: appointment.patientPhone,
          emergencyContactName: appointment.patientEmergencyContactName,
          emergencyContactPhone: appointment.patientEmergencyContactPhone,
        },

        // Doctor information
        doctor: {
          id: appointment.doctorId,
          name: appointment.doctorName,
          doctorCode: appointment.doctorCode,
          specialization: appointment.specialization,
        },

        // Booked appointment slot
        availabilityId: appointment.availabilityId,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      })),
    });
  } catch (error) {
    console.error("GET doctor appointments error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch appointments" },
      { status: 500 },
    );
  }
}
