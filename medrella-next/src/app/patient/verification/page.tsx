"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, MailCheck } from "lucide-react";
import axios from "axios";

import api from "@/lib/axios";

export default function Page() {
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function sendVerificationMail() {
    setIsSending(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/auth/send-verification");
      setSuccess(response.data.message);
    } catch (err: unknown) {
      setError(
        (axios.isAxiosError(err) &&
          typeof err.response?.data?.error === "string" &&
          err.response.data.error) ||
          "Unable to send OTP. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  }

  const hasRequestedOtp = useRef(false);
  useEffect(() => {
    const callsendVerificationMail = () => {
      if (hasRequestedOtp.current) return;

      hasRequestedOtp.current = true;
      void sendVerificationMail();
    };
    callsendVerificationMail();
  }, []);

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the six-digit OTP.");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await api.post("/auth/verify-otp", { otp });

      setSuccess(response.data.message);

      setTimeout(() => {
        router.replace("/patient/dashboard");
      }, 1000);
    } catch (err: unknown) {
      setError(
        (axios.isAxiosError(err) &&
          typeof err.response?.data?.error === "string" &&
          err.response.data.error) ||
          "Verification failed. Please try again.",
      );
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          {isSending || isVerifying ? (
            <LoaderCircle className="h-8 w-8 animate-spin text-blue-600" />
          ) : (
            <MailCheck className="h-8 w-8 text-blue-600" />
          )}
        </div>

        <h1 className="text-center text-2xl font-semibold text-slate-900">
          Verify your email
        </h1>

        <p className="mt-3 text-center text-sm leading-6 text-slate-600">
          {isSending
            ? "Sending a verification code to your registered email..."
            : "Enter the six-digit verification code sent to your registered email address."}
        </p>

        {!isSending && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-slate-700"
            >
              Verification code
            </label>

            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Enter 6-digit OTP"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="submit"
              disabled={isVerifying || otp.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifying && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isVerifying ? "Verifying..." : "Verify account"}
            </button>
          </form>
        )}

        {success && (
          <div
            role="status"
            className="mt-5 rounded-lg bg-green-50 p-4 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isSending && !isVerifying && (
          <button
            type="button"
            onClick={sendVerificationMail}
            className="mt-5 w-full text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Resend OTP
          </button>
        )}
      </div>
    </main>
  );
}
