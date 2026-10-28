
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
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

const doctorUsers = alias(users, "doctor_users");

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Please log in to view your appointments." },
        { status: 401 }
      );
    }

    // Resolve the patient from the authenticated user.
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.userId, session.userId))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { success: false, message: "Patient profile not found." },
        { status: 403 }
      );
    }

    const patientAppointments = await db
      .select({
        id: appointments.id,
        status: appointments.status,
        reason: appointments.reason,
        cancellationReason: appointments.cancellationReason,
        cancelledAt: appointments.cancelledAt,
        createdAt: appointments.createdAt,

        doctorId: doctors.id,
        doctorName: doctorUsers.name,
        isActive: doctors.isActive,
        doctorCode: doctors.doctorCode,
        specialization: doctors.specialization,
        doctorEmail: doctorUsers.email,
        doctorPhone: doctorUsers.phone,

        availabilityId: availability.id,
        appointmentDate: availability.slotDate,
        startTime: availability.startTime,
        endTime: availability.endTime,
      })
      .from(appointments)
      .innerJoin(
        doctors,
        eq(appointments.doctorId, doctors.id)
      )
      .innerJoin(
        doctorUsers,
        eq(doctors.userId, doctorUsers.id)
      )
      .innerJoin(
        availability,
        eq(appointments.availabilityId, availability.id)
      )
      .where(eq(appointments.patientId, patient.id))
      .orderBy(desc(appointments.createdAt));

    return NextResponse.json({
      success: true,
      appointments: patientAppointments,
    });
  } catch (error) {
    console.error("GET patient appointments error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch your appointments." },
      { status: 500 }
    );
  }
}
