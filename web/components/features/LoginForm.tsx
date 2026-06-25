"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { GlowCard } from "../ui/GlowCard";
import { fetchApi } from "../../lib/api-client";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Must be a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password must be at most 100 characters"),
});

type LoginFields = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError: setFormFieldError,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFields) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      // Redirect to events dashboard and force reload to propagate the session cookie
      window.location.href = "/events";
    } catch (err: any) {
      if (err.data && err.data.result && typeof err.data.result === "object") {
        Object.entries(err.data.result).forEach(([field, msg]) => {
          setFormFieldError(field as any, { type: "server", message: msg as string });
        });
      } else {
        setError(err.message || "Invalid email or password");
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <GlowCard header="01 / SIGN IN">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold font-heading text-white">Access Dashboard</h2>
            <p className="text-xs text-zinc-400 mt-1.5 font-sans">
              Enter your credentials to establish a secure session
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans">
              {error}
            </div>
          )}

          <Input
            id="login-email"
            label="Email Address"
            type="email"
            placeholder="organizer@example.com"
            error={errors.email?.message}
            disabled={loading}
            {...register("email")}
          />

          <Input
            id="login-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            disabled={loading}
            {...register("password")}
          />

          <Button
            type="submit"
            variant="gradient"
            className="w-full py-2.5 font-sans font-semibold tracking-wide"
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Establish Connection"}
          </Button>

          <div className="text-center text-xs text-zinc-500 font-sans pt-2">
            New organizer?{" "}
            <Link
              href="/register"
              className="text-neon-cyan hover:underline transition-colors font-medium ml-1"
            >
              Create Account
            </Link>
          </div>
        </form>
      </GlowCard>
    </div>
  );
};
