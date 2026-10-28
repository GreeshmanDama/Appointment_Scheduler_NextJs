import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import type { UserRole } from "@/lib/auth/jwt";
import {
  getDummyHash,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password";
import type { LoginInput, RegisterInput } from "@/lib/validations/auth";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const publicColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  role: users.role,
};

function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

export async function registerPatient(
  input: RegisterInput,
): Promise<PublicUser> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing) {
    throw new AuthError("An account with this email already exists.", 409);
  }

  const passwordHash = await hashPassword(input.password);

  const userId = randomUUID();

  try {
    return await db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          id: userId,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          passwordHash,
          role: "patient",
        })
        .returning(publicColumns);

      await tx.insert(patients).values({ userId });
      return createdUser;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AuthError("An account with this email already exists.", 409);
    }
    throw err;
  }
}

export async function loginUser(
  input: LoginInput,
  requiredRole?: UserRole,
): Promise<PublicUser> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  const passwordOk = await verifyPassword(
    input.password,
    user?.passwordHash ?? (await getDummyHash()),
  );

  if (!user || !passwordOk) {
    throw new AuthError("Invalid email or password.", 401);
  }

  if (requiredRole && user.role !== requiredRole) {
    throw new AuthError(
      requiredRole === "doctor"
        ? "This account cannot access the doctor portal."
        : "This account cannot access the administrator portal.",
      403,
    );
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const [user] = await db
    .select({ ...publicColumns })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) return null;

  const { ...publicUser } = user;
  return publicUser;
}
