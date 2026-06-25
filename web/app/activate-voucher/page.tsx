import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ActivateVoucherClient } from "@/components/features/ActivateVoucherClient";

export default async function ActivateVoucherPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("AUTH_TOKEN")?.value;

  if (!token) {
    redirect("/login");
  }

  let alias: string | undefined = undefined;
  let role: string | undefined = undefined;

  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
    const claims = JSON.parse(payloadJson);
    alias = claims.alias;
    role = claims.role;
  } catch (e) {
    console.error("Failed to decode user details from token", e);
  }

  // Redirect premium/admin users away as they don't need activation
  if (role === "PREMIUM" || role === "ADMIN") {
    redirect("/events");
  }

  return (
    <ActivateVoucherClient userAlias={alias} userRole={role} />
  );
}
