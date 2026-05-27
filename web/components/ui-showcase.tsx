"use client";

import React, { useState } from "react";
import { GlowCard } from "./ui/GlowCard";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { TextArea } from "./ui/TextArea";
import { Checkbox } from "./ui/Checkbox";
import { Badge } from "./ui/Badge";
import { Skeleton } from "./ui/Skeleton";
import { Modal } from "./ui/Modal";
import { DateRangePicker } from "./ui/DateRangePicker";
import { DatePicker } from "./ui/DatePicker";
import { OTPInput } from "./ui/OTPInput";
import { UploadFile } from "./ui/UploadFile";
import { Navbar } from "./ui/Navbar";
import { Footer } from "./ui/Footer";

export default function UiShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(true);
  const [inputText, setInputText] = useState("Demo input content");
  const [textareaText, setTextareaText] = useState(
    "This text area demonstrates the cyberpunk outline glow when focused."
  );
  const [otpValue, setOtpValue] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const showcaseNavItems = [
    { label: "Dashboard", href: "/", active: true },
    { label: "Events", href: "/events" },
    { label: "Analytics", href: "/analytics" },
    { label: "Settings", href: "/settings" }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#070708] text-[#f4f4f5] selection:bg-neon-purple selection:text-white">

      {/* 1. Navbar */}
      <Navbar navItems={showcaseNavItems} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-12 border-b border-white/5 pb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2">
            Cyber-Glow Design System
          </h1>
          <p className="text-zinc-400 max-w-2xl font-sans text-lg">
            Scaffolded workspace visual guide. This page renders all UI elements configured inside our system. Hover, click, and interact with widgets to test glow triggers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Section 1: Typography */}
          <GlowCard
            header="01 / Typography Pairing"
            actions={
              <>
                <Button variant="ghost">
                  Reset Guide
                </Button>
                <Button variant="secondary">
                  Copy Token
                </Button>
              </>
            }
          >
            <div className="space-y-6">
              <div>
                <span className="text-xs text-zinc-500 block mb-1 font-mono">Heading: Space Grotesk</span>
                <h1 className="text-3xl font-bold text-white">
                  The quick brown fox jumps over the lazy dog
                </h1>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block mb-1 font-mono">Body Content: Outfit</span>
                <p className="text-zinc-300 leading-relaxed font-sans">
                  All descriptive text is rendered in the Outfit clean sans-serif typeface, maximizing readability at smaller sizes. WCAG contrast guidelines mandate that neon colors are only used for decorative elements, leaving key context white or light gray.
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block mb-1 font-mono">Code / Metrics: JetBrains Mono</span>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 font-mono text-sm text-[#06b6d4]">
                  {"const eventUUID = \"126e84d2-7b5f-496d-8026-0a1ef036bcf4\";"}
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Section 2: Buttons & Badges */}
          <GlowCard header="02 / Action Elements & Badges">
            <div className="space-y-6">
              <div>
                <span className="text-xs text-zinc-500 block mb-2 font-mono">Button Variations</span>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">
                    Neon Purple
                  </Button>
                  <Button variant="secondary">
                    Neon Cyan
                  </Button>
                  <Button variant="danger">
                    Danger Action
                  </Button>
                  <Button variant="gradient">
                    Glow Gradient
                  </Button>
                  <Button variant="primary" disabled>
                    Disabled Button
                  </Button>
                </div>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block mb-2 font-mono">State Indicators & Badges</span>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="cyan">Active</Badge>
                  <Badge variant="purple">New Feature</Badge>
                  <Badge variant="amber">Pending</Badge>
                  <Badge variant="red">Alert</Badge>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Section 3: Inputs & Controls */}
          <GlowCard header="03 / Interactive Form Controls">
            <div className="space-y-5">
              <Input
                id="showcase-input"
                label="TextInput Label"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              <TextArea
                id="showcase-textarea"
                label="TextArea Label"
                value={textareaText}
                onChange={(e) => setTextareaText(e.target.value)}
              />

              <Checkbox
                checked={checkboxValue}
                onChange={setCheckboxValue}
                label="Enable real-time synchronization updates"
              />

              <div className="pt-2">
                <span className="text-xs text-zinc-400 block mb-1.5 font-heading tracking-wide">
                  Date Selector (From / To)
                </span>
                <DateRangePicker fromLabel="From" toLabel="To" />
              </div>

              <div className="pt-2">
                <span className="text-xs text-zinc-400 block mb-1.5 font-heading tracking-wide">
                  Single Date Selector
                </span>
                <DatePicker label="Event Date" placeholder="Choose a date" />
              </div>

              <div className="pt-2">
                <span className="text-xs text-zinc-400 block mb-1.5 font-heading tracking-wide">
                  One-Time Password (OTP) Input
                </span>
                <OTPInput value={otpValue} onChange={setOtpValue} />
              </div>

              <div className="pt-2">
                <UploadFile
                  label="Document / Asset Upload"
                  accept=".png,.jpg,.jpeg,.pdf"
                  maxSizeMB={2}
                  onFileSelect={setUploadedFile}
                />
              </div>
            </div>
          </GlowCard>

          {/* Section 4: Loaders & Overlays */}
          <GlowCard header="04 / Shimmer Loading & Overlays">
            <div className="space-y-6">
              <div>
                <span className="text-xs text-zinc-500 block mb-2 font-mono">Shimmer Loading Skeletons</span>
                <div className="border border-white/5 rounded-xl p-4 bg-black/20 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton variant="circular" />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" className="w-1/3" />
                      <Skeleton variant="text" className="w-2/3 h-2" />
                    </div>
                  </div>
                  <Skeleton variant="text" className="w-full h-2" />
                </div>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block mb-2 font-mono">Popup Modal Integration</span>
                <Button
                  variant="gradient"
                  onClick={() => setModalOpen(true)}
                  className="w-full py-3"
                >
                  Trigger Modal Box
                </Button>
              </div>
            </div>
          </GlowCard>

        </div>
      </main>

      {/* 2. Modal Overlay */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="ALERT NOTIFICATION"
      >
        <p className="text-zinc-300 font-sans leading-relaxed text-sm mb-4">
          This is the standard design scheme modal. The outer container includes a thin purple border carrying a radial neon-shadow drop glow. Use this modal style for confirm workflows, deletions, and crucial inputs.
        </p>
        <div className="bg-[#18181b] border border-white/5 rounded-lg p-3 font-mono text-xs text-neon-cyan">
          STATUS: SUCCESS_CONFIRM_AWAIT
        </div>
      </Modal>

      {/* 3. Footer */}
      <Footer />
    </div>
  );
}
