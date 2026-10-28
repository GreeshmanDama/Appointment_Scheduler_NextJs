"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartPulse, LogOut, UserRound } from "lucide-react";

import api from "@/lib/axios";
import { useUser } from "@/components/providers/user-provider";

interface DashboardHeaderProps {
  portalLabel: string; // e.g. "Admin portal"
  homeHref: string; // e.g. "/admin/dashboard"
  loginPath: string; // where to go after logout
}

export function DashboardHeader({
  portalLabel,
  homeHref,
  loginPath,
}: DashboardHeaderProps) {
  const user = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Clears the httpOnly session cookie on the server
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("token");
      router.replace(loginPath);
      router.refresh();
    }
  };

  return (
    <header className="sticky w-full top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
              <UserRound size={20} />
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs capitalize text-slate-500">{user.role}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium transition hover:bg-slate-100"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
