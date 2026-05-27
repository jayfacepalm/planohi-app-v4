import { RegisterForm } from "@/components/features/RegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | Plano.hi",
  description: "Register a new event coordinator account on Plano.hi and start planning your events.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
