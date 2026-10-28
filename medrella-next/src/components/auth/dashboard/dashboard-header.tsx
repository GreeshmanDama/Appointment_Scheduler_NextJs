"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartPulse, LogOut, UserRound, Loader2 } from "lucide-react";

import api from "@/lib/axios";
import { useUser } from "@/components/providers/user-provider";

interface DashboardHeaderProps {
  portalLabel: string;
  homeHref: string;
  loginPath: string;
}

export function DashboardHeader({
  portalLabel,
  homeHref,
  loginPath,
}: DashboardHeaderProps) {
  const user = useUser();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      try {
        localStorage.removeItem("token");
      } catch (error) {
        console.error("Unable to clear local storage:", error);
      }

      router.replace(loginPath);
      router.refresh();
    }
  };

  const displayName =
    user?.name?.trim() || "User";

  const displayRole =
    user?.role?.trim() || portalLabel;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        {/* Brand */}
        <Link
          href={homeHref}
          className="flex items-center gap-3"
          aria-label="Medrella dashboard home"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <HeartPulse size={23} aria-hidden="true" />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Medrella
            </h1>
            <p className="text-xs text-slate-500">
              {portalLabel}
            </p>
          </div>
        </Link>

        {/* User information and logout */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-900">
              {displayName}
            </p>
            <p className="text-xs capitalize text-slate-500">
              {displayRole}
            </p>
          </div>

          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700"
            aria-hidden="true"
          >
            <UserRound size={20} />
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Log out of your account"
          >
            {loggingOut ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogOut size={16} />
            )}

            <span className="hidden sm:inline">
              {loggingOut ? "Logging out..." : "Logout"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}