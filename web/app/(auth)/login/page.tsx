import { LoginForm } from "@/components/features/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Plano.hi",
  description: "Sign in to access your Plano.hi event coordinator dashboard and manage events.",
};

export default function LoginPage() {
  return <LoginForm />;
}
