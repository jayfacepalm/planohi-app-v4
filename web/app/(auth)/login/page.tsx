import { LoginForm } from "@/components/features/LoginForm";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In | Plano.hi",
  description: "Sign in to access your Plano.hi event coordinator dashboard and manage events.",
};

export default function LoginPage() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  return <LoginForm googleClientId={googleClientId} />;
}
