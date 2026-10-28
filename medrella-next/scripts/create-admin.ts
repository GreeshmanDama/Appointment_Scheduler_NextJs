
import "dotenv/config";

import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

import { users } from "../src/db/schema.js";
import { config } from "dotenv";

config({ path: ".env.local" });

let muted = false;

const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) {
      stdout.write(chunk, encoding);
    }
    callback();
  },
});

const rl = createInterface({
  input: stdin,
  output,
  terminal: true,
});

let sql: ReturnType<typeof postgres> | undefined;

async function ask(question: string): Promise<string> {
  return (await rl.question(question)).trim();
}

async function askPassword(question: string): Promise<string> {
  stdout.write(question);
  muted = true;

  try {
    return await rl.question("");
  } finally {
    muted = false;
    stdout.write("\n");
  }
}

function validate(
  name: string,
  email: string,
  password: string,
): void {
  if (name.length < 2 || name.length > 120) {
    throw new Error("Name must be between 2 and 120 characters.");
  }

  if (
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("Please enter a valid email address.");
  }

  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters long.");
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error(
      "Password is too long. Bcrypt allows at most 72 bytes.",
    );
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing from your environment.");
  }

  if (!stdin.isTTY) {
    throw new Error("Run this script in an interactive terminal.");
  }

  const name = await ask("Admin full name: ");
  const email = (await ask("Admin email: ")).toLowerCase();
  const password = await askPassword("Admin password (hidden): ");
  const confirmation = await askPassword(
    "Confirm password (hidden): ",
  );

  if (password !== confirmation) {
    throw new Error("Passwords do not match.");
  }

  validate(name, email, password);

  sql = postgres(databaseUrl);
  const db = drizzle(sql);

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error(
      `An account already exists for ${email}. No changes made.`,
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  await db.insert(users).values({
    name,
    email,
    passwordHash,
    role: "admin",
    updatedAt: now,
  });

  console.log(
    `\nAdmin account created for ${name} (${email}).`,
  );
}

rl.on("SIGINT", () => {
  console.log("\nCancelled.");
  rl.close();
  process.exit(130);
});

main()
  .catch((error: unknown) => {
    console.error(
      "\nAdmin seed failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();

    if (sql) {
      await sql.end();
    }
  });
