import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | undefined;
export function getDummyHash() {
  return (dummyHash ??= bcrypt.hash("not-a-real-password", SALT_ROUNDS));
}
