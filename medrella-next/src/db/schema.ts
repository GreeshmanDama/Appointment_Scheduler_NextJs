import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  time,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";

import { relations, sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["patient", "doctor", "admin"]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const availabilityStatusEnum = pgEnum("availability_status", [
  "available",
  "booked",
  "blocked",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: varchar("name", { length: 120 }).notNull(),

    email: varchar("email", { length: 255 }).notNull().unique(),

    passwordHash: text("password_hash").notNull(),

    phone: varchar("phone", { length: 20 }),

    role: userRoleEnum("role").notNull().default("patient"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("users_role_idx").on(table.role)],
);

export const doctors = pgTable(
  "doctors",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    doctorCode: varchar("doctor_code", { length: 30 }).notNull().unique(),

    specialization: varchar("specialization", {
      length: 120,
    }).notNull(),

    qualification: varchar("qualification", {
      length: 200,
    }).notNull(),

    experienceYears: integer("experience_years").notNull().default(0),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("doctors_specialization_idx").on(table.specialization),
    index("doctors_is_active_idx").on(table.isActive),
    check("doctors_experience_nonnegative", sql`${table.experienceYears} >= 0`),
  ],
);

export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, {
      onDelete: "restrict",
    }),

  dateOfBirth: date("date_of_birth"),

  gender: varchar("gender", { length: 30 }),

  address: text("address"),

  emergencyContactName: varchar("emergency_contact_name", {
    length: 120,
  }),

  emergencyContactPhone: varchar("emergency_contact_phone", {
    length: 20,
  }),

  emailVerifiedAt: timestamp("email_verified_at", {
    withTimezone: true,
  }),

  emailVerificationOtpHash: varchar("email_verification_otp_hash", {
    length: 64,
  }),
  emailVerificationOtpExpiresAt: timestamp(
    "email_verification_otp_expires_at",
    { withTimezone: true },
  ),
  emailVerificationOtpAttempts: integer("email_verification_otp_attempts")
    .notNull()
    .default(0),

  isVerified: boolean("is_verified").notNull().default(false),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const availability = pgTable(
  "availability",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, {
        onDelete: "restrict",
      }),

    slotDate: date("slot_date").notNull(),

    startTime: time("start_time").notNull(),

    endTime: time("end_time").notNull(),

    status: availabilityStatusEnum("status").notNull().default("available"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("availability_doctor_date_idx").on(table.doctorId, table.slotDate),

    index("availability_status_date_idx").on(table.status, table.slotDate),

    uniqueIndex("availability_doctor_slot_unique").on(
      table.doctorId,
      table.slotDate,
      table.startTime,
      table.endTime,
    ),

    check(
      "availability_time_range_valid",
      sql`${table.startTime} < ${table.endTime}`,
    ),
  ],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, {
        onDelete: "restrict",
      }),

    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, {
        onDelete: "restrict",
      }),

    availabilityId: uuid("availability_id")
      .notNull()
      .references(() => availability.id, {
        onDelete: "restrict",
      }),

    status: appointmentStatusEnum("status").notNull().default("pending"),

    reason: text("reason"),

    cancellationReason: text("cancellation_reason"),

    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("appointments_patient_idx").on(table.patientId),

    index("appointments_doctor_status_idx").on(table.doctorId, table.status),

    index("appointments_created_at_idx").on(table.createdAt),

    uniqueIndex("appointments_active_slot_unique")
      .on(table.availabilityId)
      .where(sql`${table.status} IN ('pending', 'confirmed')`),
  ],
);

export const usersRelations = relations(users, ({ one }) => ({
  doctor: one(doctors),
  patient: one(patients),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),

  availability: many(availability),

  appointments: many(appointments),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),

  appointments: many(appointments),
}));

export const availabilityRelations = relations(
  availability,
  ({ one, many }) => ({
    doctor: one(doctors, {
      fields: [availability.doctorId],
      references: [doctors.id],
    }),

    appointments: many(appointments),
  }),
);

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),

  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.id],
  }),

  availability: one(availability, {
    fields: [appointments.availabilityId],
    references: [availability.id],
  }),
}));
