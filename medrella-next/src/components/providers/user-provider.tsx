"use client";

import { createContext, useContext } from "react";
import type { PublicUser } from "@/server/services/auth.service";

const UserContext = createContext<PublicUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser must be used inside <UserProvider>");
  return user;
}