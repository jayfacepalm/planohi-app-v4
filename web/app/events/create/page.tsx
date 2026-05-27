import React from "react";
import { CreateEventForm } from "@/components/features/CreateEventForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Event | Plano.hi",
  description: "Set up a new event planning canvas workspace.",
};

export default function CreateEventPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold font-heading tracking-wider bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">
          PLANO.HI
        </h1>
        <span className="text-xs text-zinc-500 font-mono tracking-widest mt-1 block uppercase">
          Workspace Configuration
        </span>
      </div>

      <CreateEventForm />
    </>
  );
}
