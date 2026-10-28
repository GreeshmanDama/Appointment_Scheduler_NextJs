# Medrella --- Doctor Appointment Scheduler

Medrella is a full-stack doctor appointment scheduling web application
built with Next.js. It provides separate experiences for patients,
doctors, and administrators, with appointment booking, doctor
availability management, patient records, and role-based access control.

> **Project status:** This README documents the application features and
> implementation work completed so far. Before deploying, verify the
> environment variables, database migrations, email sender
> configuration, and scheduled-job setup for your own environment.

## Table of contents

-   [Overview](#overview)
-   [Features](#features)
-   [Appointment workflow](#appointment-workflow)
-   [Technology stack](#technology-stack)
-   [Database design](#database-design)
-   [Project structure](#project-structure)
-   [Getting started](#getting-started)
-   [Environment variables](#environment-variables)
-   [Database migrations](#database-migrations)
-   [API and security notes](#api-and-security-notes)
-   [Automatic appointment
    completion](#automatic-appointment-completion)
-   [Deployment](#deployment)
-   [Development commands](#development-commands)
-   [Current scope and next steps](#current-scope-and-next-steps)

## Overview

Medrella is designed to simplify the process of finding a doctor,
booking a suitable appointment slot, and managing the appointment
through its lifecycle.

The application has three primary roles:

-   **Patient:** registers, manages personal information, views
    available doctors, books appointments, and tracks or cancels
    bookings.
-   **Doctor:** manages availability and reviews appointments and
    patient contact information.
-   **Administrator:** manages the doctor side of the platform,
    including creating doctor accounts.

The project uses a PostgreSQL database accessed through Drizzle ORM. The
UI is built with the Next.js App Router, React, TypeScript, and Tailwind
CSS.

## Features

### Patient portal

-   Patient registration and login.
-   Patient dashboard and appointment-related pages.
-   Browse the doctor directory and view doctor information.
-   Book an available appointment slot and provide a reason for the
    visit.
-   View personal appointments and appointment statuses.
-   Cancel eligible appointments, with cancellation information recorded
    where supported.
-   View and edit personal profile information, including name, email,
    phone number, and emergency contact details.
-   Email OTP verification flow using Resend.
-   Search and view appointment details in the patient-facing pages.

### Doctor portal

-   Doctor login and a dedicated doctor dashboard.
-   Doctor profile and specialization information.
-   Manage date-specific availability and time slots.
-   Review appointments assigned to the authenticated doctor.
-   View patient name, email, phone number, and emergency contact
    information when provided.
-   Review the appointment reason and scheduled date/time.
-   Appointment status workflow, including confirming or rejecting
    requests where enabled.
-   View appointment summaries such as total, upcoming, completed, and
    unique patients.

### Administrator portal

-   Dedicated admin login and dashboard.
-   Create doctor accounts through the admin interface.
-   Support for doctor identity details, specialization, and doctor
    codes.
-   Role-specific access to administrative pages and APIs.

### Appointment scheduling

-   Date-based doctor availability.
-   Appointment records linked to a patient, doctor, and availability
    slot.
-   Appointment status tracking, including pending, confirmed,
    cancelled, completed, and no-show states where used by the
    application.
-   Cancellation reason and cancellation timestamp fields.
-   Database constraints and indexes intended to protect data integrity
    and prevent duplicate active bookings for a slot.
-   Server-side checks should enforce appointment ownership and slot
    availability; these checks must remain in place as the application
    evolves.

### Automated appointment completion

A protected cron endpoint checks confirmed appointments against the
current date and time in `Asia/Kolkata`. If an appointment's end time
has passed, the route changes its status from `confirmed` to
`completed`.

The endpoint requires a `CRON_SECRET` bearer token. Defining the route
does not schedule it by itself: development needs a manual request or a
local scheduler, while production needs a configured scheduler such as
Vercel Cron or an operating-system/server cron job.

### UI and developer experience

-   Next.js App Router and TypeScript.
-   Responsive pages styled with Tailwind CSS.
-   Lucide icons.
-   Reusable React components.
-   Drizzle ORM schema and SQL migrations.
-   A `.env.local.example` template for documenting required
    configuration without committing real secrets.
-   A `vercel.json` deployment configuration file is present; verify its
    contents before relying on scheduled jobs or other platform
    behavior.

## Appointment workflow

A typical appointment flow is:

1.  An administrator creates a doctor account.
2.  A doctor configures available dates and time slots.
3.  A patient browses doctors and selects an available slot.
4.  The application validates the request and creates an appointment.
5.  The doctor reviews the appointment and confirms or rejects it,
    depending on the configured workflow.
6.  The patient and doctor can view the appointment and its current
    status.
7.  Eligible cancellations are recorded with their reason and timestamp.
8.  A scheduled call to the protected completion endpoint can mark
    confirmed appointments as completed after their end time.

Exact status transitions depend on the API handlers currently enabled in
the project.

## Technology stack

  -----------------------------------------------------------------------
  Area                                Technology
  ----------------------------------- -----------------------------------
  Framework                           Next.js 16 (App Router)

  UI                                  React, TypeScript

  Styling                             Tailwind CSS

  Icons                               Lucide React

  Database                            PostgreSQL

  Database access                     Drizzle ORM

  Database hosting option             Neon PostgreSQL

  Email delivery                      Resend

  Validation                          Validate request data on the
                                      server; use the validation
                                      libraries configured in the project

  Deployment configuration            Vercel configuration file included
  -----------------------------------------------------------------------

## Database design

The core schema includes the following entities:

  -----------------------------------------------------------------------
  Table                               Purpose
  ----------------------------------- -----------------------------------
  `users`                             Shared login identity and account
                                      information, including name, email,
                                      phone, and role

  `patients`                          Patient profile, emergency contact,
                                      and email verification information

  `doctors`                           Doctor profile, specialization,
                                      doctor code, and active state

  `availability`                      Doctor-specific dates, start/end
                                      times, and slot status

  `appointments`                      Patient bookings, linked doctor and
                                      slot, status, reason, and
                                      cancellation details
  -----------------------------------------------------------------------

The schema also uses role and status enums, foreign keys, indexes, and
relations to keep records connected. A uniqueness constraint/index is
intended to prevent multiple active appointments from claiming the same
slot. Check the current schema and migrations for the exact constraint
definitions.

## Project structure

The main application is located in `medrella-next/` when working from
the parent `appointment_scheduler` directory.

``` text
medrella-next/
├── drizzle/                 # Generated SQL migrations
├── scripts/                 # Project scripts
├── src/
│   ├── app/
│   │   ├── admin/           # Admin pages and routes
│   │   ├── api/             # API route handlers
│   │   ├── appointments/    # Appointment-related pages
│   │   ├── doctor/          # Doctor portal
│   │   ├── doctors/         # Doctor directory/details
│   │   ├── login/           # Login pages
│   │   ├── patient/         # Patient portal
│   │   └── register/        # Registration pages
│   ├── components/          # Shared UI components
│   ├── data/                # Static or application data
│   ├── db/                  # Database setup and Drizzle schema
│   ├── lib/                 # Shared utilities and auth helpers
│   ├── server/              # Server-side services
│   └── proxy.ts             # Request proxy/middleware-related logic
├── .env.local.example       # Environment variable template
├── drizzle.config.ts        # Drizzle Kit configuration
├── next.config.ts           # Next.js configuration
├── package.json
└── vercel.json              # Vercel configuration
```

Some route and helper names may change as the project develops.

## Getting started

### Prerequisites

Install the following before running the application:

-   Node.js compatible with the version used by the project.
-   npm.
-   A PostgreSQL database (for example, a Neon database).
-   Resend API access if you want to test email verification.

### 1. Clone the repository

If the repository contains the application in a subdirectory:

``` bash
git clone https://github.com/GreeshmanDama/Appointment_Scheduler_NextJs.git
cd Appointment_Scheduler_NextJs/medrella-next
```

If the repository root itself is the Next.js application, enter the
cloned root directory instead.

### 2. Install dependencies

``` bash
npm install
```

### 3. Configure environment variables

Copy the example file:

**PowerShell**

``` powershell
Copy-Item .env.local.example .env.local
```

**macOS/Linux**

``` bash
cp .env.local.example .env.local
```

Fill in the actual values for your local environment. Do not commit
`.env.local`.

### 4. Configure the database

Set the PostgreSQL connection string in `.env.local` using the exact
variable name expected by `drizzle.config.ts` and the database
initialization code. The variable is commonly named `DATABASE_URL`, but
confirm the project configuration before using that name.

### 5. Apply database migrations

Review the available scripts in `package.json` and the settings in
`drizzle.config.ts`. If Drizzle Kit is configured in the standard way,
migration generation and application typically use:

``` bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Only generate a new migration when the schema has changed. Confirm that
the existing migrations have been applied to the intended database
before starting the app.

### 6. Start the development server

``` bash
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

The exact variable names used by the application are defined in
`.env.local.example`, `drizzle.config.ts`, and the relevant server
modules. The following values are known to be relevant to features
discussed in this project:

  -----------------------------------------------------------------------
  Variable                            Purpose
  ----------------------------------- -----------------------------------
  `CRON_SECRET`                       Protects the appointment-completion
                                      endpoint from unauthorized calls

  `RESEND_API_KEY`                    API key used to send verification
                                      emails through Resend

  `RESEND_FROM_EMAIL`                 Verified sender address/name used
                                      for verification emails

  `EMAIL_VERIFICATION_SECRET`         Secret used when hashing email
                                      verification OTPs

  PostgreSQL connection variable      Database connection string; use the
                                      exact name expected by the project
                                      configuration

  Authentication/JWT secret, if       Used by the project's token/session
  configured                          implementation; use the exact name
                                      expected by the auth code
  -----------------------------------------------------------------------

Example values for email/cron configuration:

``` env
CRON_SECRET=replace_with_a_long_random_secret
RESEND_API_KEY=re_replace_with_your_key
RESEND_FROM_EMAIL=Medrella <onboarding@resend.dev>
EMAIL_VERIFICATION_SECRET=replace_with_a_long_random_secret
```

These are examples, not production secrets. The Resend test sender
`onboarding@resend.dev` has recipient restrictions; configure a verified
sending domain in Resend before sending to arbitrary users. Never commit
real keys, passwords, database URLs, session secrets, or OTP secrets.

## Database migrations

The project uses Drizzle ORM and stores generated SQL migration files in
`drizzle/`.

A typical schema update workflow is:

1.  Update the schema under `src/db/`.
2.  Generate a migration with `npx drizzle-kit generate`.
3.  Review the generated SQL.
4.  Apply the migration to the intended database using the configured
    migration command.
5.  Test the affected API routes and pages.

Do not assume that generating a migration also applies it to the
database.

## API and security notes

-   Protect private API routes by checking the authenticated session.
-   Authorize operations using the role and resource ownership on the
    server; hiding a UI button is not sufficient authorization.
-   Doctor appointment queries should be scoped to the authenticated
    doctor's profile.
-   Patient profile updates should validate input and reset email
    verification when the email address changes.
-   The verification flow uses a short-lived OTP and an attempt limit.
    Production deployments should also enforce resend cooldowns and rate
    limits.
-   Cron endpoints should validate the bearer secret and should never
    expose that secret to browser code.
-   Keep secrets in environment variables and out of Git.
-   Return only patient information necessary for the authenticated
    user's task.

## Automatic appointment completion

The completion route uses India Standard Time (`Asia/Kolkata`) when
deciding whether a confirmed appointment has ended. To test it locally,
start the development server and call the actual route path with the
configured secret:

``` powershell
$headers = @{
    Authorization = "Bearer $env:CRON_SECRET"
}

Invoke-RestMethod `
    -Uri "http://localhost:3000/api/cron/complete-appointments" `
    -Method GET `
    -Headers $headers
```

Replace the URL path with the route's actual location under
`src/app/api/`. Set `$env:CRON_SECRET` in that PowerShell session first,
or provide the secret securely without committing it to a script.

For repeated local testing, use a separate terminal and a local loop or
task scheduler. For production, configure a scheduler to call the route
at an appropriate interval and include the authorization header. A cron
route alone does not run periodically.

## Deployment

The project includes a `vercel.json` file and is structured as a Next.js
application, making Vercel a possible deployment target.

Before deploying:

1.  Provision a production PostgreSQL database.
2.  Configure production environment variables in the hosting platform.
3.  Apply reviewed database migrations.
4.  Configure a verified Resend sender domain if verification emails
    must reach users beyond the permitted test recipients.
5.  Configure the appointment-completion scheduler separately and
    securely.
6.  Test patient, doctor, and admin authorization with separate
    accounts.
7.  Confirm that private pages and API routes cannot be accessed without
    the required session and role.
8.  Test booking conflicts, cancellations, email verification, and
    appointment completion against production-like data.

Do not assume that a local `.env.local` file is deployed automatically.
Configure environment variables in the hosting platform.

## Development commands

Common commands (verify the available scripts in `package.json`):

``` bash
npm run dev       # Start local development
npm run build     # Create a production build
npm run start     # Start the production server
npm run lint      # Run linting, if configured
```

Database commands commonly used with Drizzle Kit:

``` bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## Current scope and next steps

The project work so far includes the core role-based scheduling
structure, patient/doctor/admin pages, Drizzle schema and migrations,
appointment APIs, patient profile editing, email OTP verification,
doctor appointment listings with patient contact details, and a
protected endpoint for automatic appointment completion.

Recommended verification before calling the project production-ready:

-   Run linting and a production build.
-   Confirm all migrations are applied to a clean database.
-   Test authorization and ownership checks for every private API.
-   Add and test rate limits/cooldowns for OTP sending and verification.
-   Verify the exact appointment status transitions and cancellation
    rules.
-   Configure and test the production cron scheduler.
-   Verify all environment variable names against the actual code.
-   Add automated tests for booking conflicts, time-zone boundaries, and
    expired appointments.

------------------------------------------------------------------------

## Maintainer

**Medrella** --- Doctor Appointment Scheduler

Repository:
[Appointment_Scheduler_NextJs](https://github.com/GreeshmanDama/Appointment_Scheduler_NextJs)
