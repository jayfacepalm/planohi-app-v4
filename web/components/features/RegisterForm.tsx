"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { GlowCard } from "../ui/GlowCard";
import { OTPInput } from "../ui/OTPInput";
import { fetchApi } from "../../lib/api-client";
import Link from "next/link";

const registerSchema = z.object({
  email: z.string().min(1, "Email is required").email("Must be a valid email address"),
  alias: z.string().min(2, "Alias must be at least 2 characters").max(50, "Alias too long"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password must be at most 100 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFields = z.infer<typeof registerSchema>;

export const RegisterForm: React.FC<{ googleClientId: string }> = ({ googleClientId }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpResent, setOtpResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const {
    register,
    handleSubmit,
    getValues,
    setError: setFormFieldError,
    formState: { errors },
  } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
  });

  const handleGoogleCallback = async (response: any) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi<any>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credentialToken: response.credential }),
      });
      window.location.href = "/events";
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Google");
      setLoading(false);
    }
  };

  const googleBtnNodeRef = React.useRef<HTMLDivElement | null>(null);

  const renderGoogleButton = React.useCallback(() => {
    const node = googleBtnNodeRef.current;
    if (node && (window as any).google?.accounts?.id) {
      const google = (window as any).google;
      const fallbackWidth = typeof window !== "undefined" ? Math.min(382, window.innerWidth - 64) : 280;
      const targetWidth = Math.max(250, Math.min(400, node.offsetWidth || fallbackWidth));
      google.accounts.id.renderButton(
        node,
        { theme: "filled_black", size: "large", width: targetWidth, text: "signup_with", shape: "rectangular" }
      );
    }
  }, [googleClientId]);

  const googleBtnRef = React.useCallback((node: HTMLDivElement | null) => {
    googleBtnNodeRef.current = node;
    renderGoogleButton();
  }, [renderGoogleButton]);

  React.useEffect(() => {
    const id = "google-gsi-client";
    let script = document.getElementById(id) as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = id;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const initializeGoogle = () => {
      if ((window as any).google?.accounts?.id) {
        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCallback,
        });
        renderGoogleButton();
      }
    };

    if ((window as any).google?.accounts?.id) {
      initializeGoogle();
    } else {
      script.addEventListener("load", initializeGoogle);
    }

    return () => {
      script.removeEventListener("load", initializeGoogle);
    };
  }, [googleClientId, renderGoogleButton]);

  const onProceed = async (data: RegisterFields) => {
    setLoading(true);
    setError(null);
    try {
      const { confirmPassword, ...payload } = data;
      await fetchApi<void>("/auth/register/otp", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setStep(2);
    } catch (err: any) {
      if (err.data && err.data.result && typeof err.data.result === "object") {
        Object.entries(err.data.result).forEach(([field, msg]) => {
          setFormFieldError(field as any, { type: "server", message: msg as string });
        });
      } else {
        setError(err.message || "Failed to send verification code");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError(null);
    setOtpResent(false);
    try {
      const data = getValues();
      const { confirmPassword, ...payload } = data;
      await fetchApi<void>("/auth/register/otp", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setOtpResent(true);
      setOtp("");
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = getValues();
      const { confirmPassword, ...payload } = data;
      await fetchApi<any>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          otp,
        }),
      });
      // Registration successful! Redirect directly to events page.
      window.location.href = "/events";
    } catch (err: any) {
      if (err.data && err.data.result && typeof err.data.result === "object") {
        Object.entries(err.data.result).forEach(([field, msg]) => {
          setFormFieldError(field as any, { type: "server", message: msg as string });
          if (field === "email" || field === "alias" || field === "password") {
            setStep(1);
          }
        });
      } else {
        setError(err.message || "Failed to complete registration");
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <GlowCard header={`02 / SIGN UP (Step ${step} of 2)`}>
        {step === 1 ? (
          <form onSubmit={handleSubmit(onProceed)} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-heading text-white">Create Planner Account</h2>
              <p className="text-xs text-zinc-400 mt-1.5 font-sans">
                Set up credentials to register a workspace
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans">
                {error}
              </div>
            )}

            <Input
              id="register-email"
              label="Email Address"
              type="email"
              placeholder="organizer@example.com"
              error={errors.email?.message}
              disabled={loading}
              {...register("email")}
            />

            <Input
              id="register-alias"
              label="Display Alias (Visible in UI)"
              type="text"
              placeholder=""
              error={errors.alias?.message}
              disabled={loading}
              {...register("alias")}
            />

            <Input
              id="register-password"
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              disabled={loading}
              {...register("password")}
            />

            <Input
              id="register-confirm-password"
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              disabled={loading}
              {...register("confirmPassword")}
            />

            <Button
              type="submit"
              variant="gradient"
              className="w-full py-2.5 font-sans font-semibold tracking-wide"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Proceed to Verification"}
            </Button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-zinc-500 text-xs uppercase tracking-wider font-sans">Or authenticate with</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <div className="flex justify-center w-full min-h-[44px]">
              <div ref={googleBtnRef} />
            </div>

            <div className="text-center text-xs text-zinc-500 font-sans pt-2">
              Already registered?{" "}
              <Link
                href="/login"
                className="text-neon-cyan hover:underline transition-colors font-medium ml-1"
              >
                Access Account
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={onSubmitOtp} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-heading text-white">Verify Your Identity</h2>
              <p className="text-xs text-zinc-400 mt-1.5 font-sans">
                Enter the 6-digit OTP code sent to your email
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans">
                {error}
              </div>
            )}

            {otpResent && (
              <div className="bg-neon-purple/10 border border-neon-purple/30 rounded-lg p-3 text-xs text-zinc-300 font-sans">
                A new OTP verification code has been logged to the terminal log.
              </div>
            )}

            <div className="py-4">
              <OTPInput value={otp} onChange={setOtp} disabled={loading} />
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full py-2.5 font-sans font-semibold tracking-wide"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Activating..." : "Verify & Complete Signup"}
            </Button>

            <div className="flex justify-between items-center text-xs pt-2 font-sans px-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                disabled={loading}
              >
                ← Back to edit details
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                className="text-neon-cyan hover:underline transition-colors font-medium disabled:text-zinc-600 disabled:no-underline disabled:cursor-not-allowed"
                disabled={loading || cooldown > 0}
              >
                {cooldown > 0 ? `Resend Code (${cooldown}s)` : "Resend Code"}
              </button>
            </div>
          </form>
        )}
      </GlowCard>
    </div>
  );
};
