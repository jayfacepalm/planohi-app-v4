import React from "react";
import { cookies } from "next/headers";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";

export default async function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { label: "Dashboard", href: "/events", active: true },
  ];

  // Decode the user alias and role from AUTH_TOKEN HttpOnly cookie on the server
  const cookieStore = await cookies();
  const token = cookieStore.get("AUTH_TOKEN")?.value;
  let alias: string | undefined = undefined;
  let role: string | undefined = undefined;

  if (token) {
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
      const claims = JSON.parse(payloadJson);
      alias = claims.alias;
      role = claims.role;
    } catch (e) {
      console.error("Failed to decode user details from AUTH_TOKEN", e);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070708] text-[#f4f4f5] selection:bg-neon-purple selection:text-white relative overflow-hidden">
      {/* Background Decorative Cyber-Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-purple/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-cyan/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Thin grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      {/* Navbar header */}
      <Navbar navItems={navItems} userAlias={alias} userRole={role} />


      {/* Main content */}
      <main className="flex-1 flex flex-col justify-start items-center px-6 py-12 relative z-10 w-full">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
