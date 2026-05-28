"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Calendar, Users, Clock, CheckCircle2, XCircle, AlertTriangle, Sparkles, RefreshCw, ChevronRight } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

interface EventDto {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  bannerUrl: string;
}

interface PublicRsvpDetailsDto {
  inviteeName: string;
  allowedGuests: number;
  attendingGuests: number;
  status: string;
  event: EventDto;
}

interface RsvpClientProps {
  initialDetails: PublicRsvpDetailsDto;
  token: string;
}

export const RsvpClient: React.FC<RsvpClientProps> = ({ initialDetails, token }) => {
  const { event } = initialDetails;
  const [details, setDetails] = useState<PublicRsvpDetailsDto>(initialDetails);
  
  // Form State
  const [status, setStatus] = useState<"ACCEPTED" | "DECLINED">(
    initialDetails.status === "DECLINED" ? "DECLINED" : "ACCEPTED"
  );
  const [attendingGuests, setAttendingGuests] = useState<number>(
    initialDetails.status === "ACCEPTED" ? initialDetails.attendingGuests : 1
  );
  
  // UI States
  const [isEditing, setIsEditing] = useState<boolean>(initialDetails.status === "PENDING");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    ended: false,
  });

  useEffect(() => {
    setMounted(true);
    
    const calculateTimeLeft = () => {
      const difference = +new Date(event.startDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          ended: false,
        });
      } else {
        setTimeLeft(prev => ({ ...prev, ended: true }));
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [event.startDate]);

  const isEventEnded = mounted ? new Date() > new Date(event.endDate) : false;

  const handleIncrement = () => {
    if (attendingGuests < details.allowedGuests) {
      setAttendingGuests(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (attendingGuests > 1) {
      setAttendingGuests(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEventEnded) {
      setSubmitError("The RSVP window for this event is closed.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await fetchApi<void>(`/public/rsvp/${token}`, {
        method: "POST",
        body: JSON.stringify({
          status,
          attendingGuests: status === "ACCEPTED" ? attendingGuests : 0,
        }),
      });

      // Refetch latest details to update cached screen/state
      const updatedDetails = await fetchApi<PublicRsvpDetailsDto>(`/public/rsvp/${token}`);
      setDetails(updatedDetails);
      setStatus(updatedDetails.status === "DECLINED" ? "DECLINED" : "ACCEPTED");
      setAttendingGuests(updatedDetails.status === "ACCEPTED" ? updatedDetails.attendingGuests : 1);
      
      setSubmitSuccess(true);
      setIsEditing(false);
      
      // Auto fade success message
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error("Failed to submit RSVP:", err);
      setSubmitError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!mounted) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const bannerUrl = event.bannerUrl ? `/api/proxy/public/rsvp/banner?token=${token}` : null;

  return (
    <div className="min-h-screen bg-[#070708] relative overflow-hidden flex flex-col justify-center items-center px-4 py-12">
      {/* High-tech glow backdrop */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-neon-purple/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* SVG grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none opacity-40" />

      <div className="w-full max-w-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neon-cyan/20 bg-neon-cyan/5 text-neon-cyan text-[10px] font-mono tracking-widest uppercase">
            <Sparkles className="w-3 h-3 animate-pulse" /> Invitation Portal
          </div>
          <h2 className="text-2xl font-heading font-extrabold text-white tracking-widest">
            PLANO<span className="text-neon-cyan">.</span>HI
          </h2>
        </div>

        {/* Invitation Card */}
        <div className="bg-[#121214]/90 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
          {/* Cyberpunk Top Accent Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-purple" />

          {/* Banner image or fallback grid */}
          {bannerUrl ? (
            <div className="w-full h-48 relative overflow-hidden border-b border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121214] to-transparent" />
            </div>
          ) : (
            <div className="w-full h-32 bg-gradient-to-br from-neon-purple/10 to-neon-cyan/10 flex items-center justify-center relative overflow-hidden border-b border-white/5">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:15px_15px] opacity-40" />
              <div className="text-neon-purple/35 font-mono text-[9px] uppercase tracking-widest">Digital Canvas invite</div>
            </div>
          )}

          {/* Card Content */}
          <div className="p-6 md:p-8 space-y-6">
            
            {/* Event Name & Host Info */}
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 font-mono">
                DEAR <span className="text-neon-cyan font-semibold">{details.inviteeName.toUpperCase()}</span>, YOU ARE INVITED TO:
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-wide leading-tight">
                {event.title}
              </h1>
              {event.description && (
                <p className="text-xs text-zinc-400 font-sans leading-relaxed pt-1">
                  {event.description}
                </p>
              )}
            </div>

            {/* Date Details & Lockout Warnings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-white/5">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-neon-purple mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Starts</div>
                  <div className="text-xs text-white font-medium">
                    {mounted ? formatDate(event.startDate) : "Loading..."}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-neon-cyan mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Ends</div>
                  <div className="text-xs text-white font-medium">
                    {mounted ? formatDate(event.endDate) : "Loading..."}
                  </div>
                </div>
              </div>
            </div>

            {/* Countdown Clock */}
            {mounted && !timeLeft.ended && (
              <div className="bg-[#070708]/60 border border-white/5 rounded-xl p-4 text-center space-y-2">
                <div className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">COUNTDOWN TO SYSTEM INITIATION</div>
                <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
                  <div className="bg-[#121214] border border-white/5 rounded-lg py-2 px-1">
                    <div className="text-lg font-mono font-bold text-neon-cyan leading-none">
                      {String(timeLeft.days).padStart(2, "0")}
                    </div>
                    <div className="text-[8px] text-zinc-500 font-mono uppercase mt-1">Days</div>
                  </div>
                  <div className="bg-[#121214] border border-white/5 rounded-lg py-2 px-1">
                    <div className="text-lg font-mono font-bold text-neon-cyan leading-none">
                      {String(timeLeft.hours).padStart(2, "0")}
                    </div>
                    <div className="text-[8px] text-zinc-500 font-mono uppercase mt-1">Hrs</div>
                  </div>
                  <div className="bg-[#121214] border border-white/5 rounded-lg py-2 px-1">
                    <div className="text-lg font-mono font-bold text-neon-cyan leading-none">
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </div>
                    <div className="text-[8px] text-zinc-500 font-mono uppercase mt-1">Min</div>
                  </div>
                  <div className="bg-[#121214] border border-white/5 rounded-lg py-2 px-1">
                    <div className="text-lg font-mono font-bold text-neon-cyan leading-none">
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </div>
                    <div className="text-[8px] text-zinc-500 font-mono uppercase mt-1">Sec</div>
                  </div>
                </div>
              </div>
            )}

            {/* Success and Error Alerts */}
            {submitSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Response submitted successfully. Cache updated.</span>
              </div>
            )}
            
            {submitError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Locked Out State Indicator */}
            {isEventEnded && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400">
                <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse text-red-500" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold font-heading uppercase tracking-wide">RSVP WINDOW CLOSED</div>
                  <p className="text-[11px] text-zinc-500 font-sans leading-normal">
                    This event has concluded. Responses are locked and cannot be updated.
                  </p>
                </div>
              </div>
            )}

            {/* RSVP Form vs Response Summary */}
            {isEditing && !isEventEnded ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Attending vs Declined Choice */}
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
                    WILL YOU ATTEND?
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Attending option */}
                    <button
                      type="button"
                      onClick={() => setStatus("ACCEPTED")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all duration-300 cursor-pointer ${
                        status === "ACCEPTED"
                          ? "bg-neon-purple/10 border-neon-purple shadow-neon-purple"
                          : "bg-[#070708] border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300"
                      }`}
                    >
                      <CheckCircle2 className={`w-6 h-6 mb-2 ${status === "ACCEPTED" ? "text-neon-purple" : "text-zinc-600"}`} />
                      <span className="text-xs font-heading font-extrabold tracking-wider uppercase text-white">Attending</span>
                    </button>

                    {/* Declined option */}
                    <button
                      type="button"
                      onClick={() => setStatus("DECLINED")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all duration-300 cursor-pointer ${
                        status === "DECLINED"
                          ? "bg-red-500/10 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                          : "bg-[#070708] border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300"
                      }`}
                    >
                      <XCircle className={`w-6 h-6 mb-2 ${status === "DECLINED" ? "text-red-500" : "text-zinc-600"}`} />
                      <span className="text-xs font-heading font-extrabold tracking-wider uppercase text-white">Declining</span>
                    </button>
                  </div>
                </div>

                {/* Headcount Selection (Allowed Guests) */}
                {status === "ACCEPTED" && details.allowedGuests > 1 && (
                  <div className="space-y-2 p-4 rounded-xl border border-white/5 bg-[#070708]/60 transition-all duration-300 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
                          TOTAL ATTENDING HEADCOUNT
                        </label>
                        <p className="text-[11px] text-zinc-500">Includes you and allowed guests</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-neon-cyan px-2 py-0.5 rounded border border-neon-cyan/20 bg-neon-cyan/5">
                        Max {details.allowedGuests}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-6 pt-2">
                      <button
                        type="button"
                        onClick={handleDecrement}
                        disabled={attendingGuests <= 1}
                        className="w-10 h-10 rounded-lg border border-white/10 bg-[#121214] flex items-center justify-center text-white hover:border-neon-cyan hover:text-neon-cyan transition-all disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-white cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-2xl font-mono font-bold text-white w-8 text-center">
                        {attendingGuests}
                      </span>
                      <button
                        type="button"
                        onClick={handleIncrement}
                        disabled={attendingGuests >= details.allowedGuests}
                        className="w-10 h-10 rounded-lg border border-white/10 bg-[#121214] flex items-center justify-center text-white hover:border-neon-cyan hover:text-neon-cyan transition-all disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  {details.status !== "PENDING" && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setStatus(details.status === "DECLINED" ? "DECLINED" : "ACCEPTED");
                        setAttendingGuests(details.status === "ACCEPTED" ? details.attendingGuests : 1);
                        setIsEditing(false);
                      }}
                      disabled={isSubmitting}
                      className="w-1/3 py-3"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="gradient"
                    disabled={isSubmitting}
                    className={`flex-1 py-3 flex items-center justify-center gap-1.5`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        Confirm Selection <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              /* Saved State Summary Screen */
              <div className="space-y-6">
                <div className="p-5 rounded-xl border border-white/5 bg-[#070708]/65 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">RESPONSE STATE</span>
                    <span className="text-[9px] font-mono tracking-widest uppercase flex items-center gap-1 px-2.5 py-0.5 rounded-full border bg-zinc-950">
                      {details.status === "ACCEPTED" ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
                          <span className="text-neon-purple font-semibold">ATTENDING</span>
                        </>
                      ) : details.status === "DECLINED" ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="text-red-400 font-semibold">DECLINED</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          <span className="text-yellow-400 font-semibold">PENDING</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {details.status === "ACCEPTED" ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-neon-purple" />
                        </div>
                        <div>
                          <div className="text-[11px] text-zinc-500 font-mono">HEADCOUNT COMMITTED</div>
                          <div className="text-sm font-bold text-white">
                            {details.attendingGuests} {details.attendingGuests === 1 ? "Guest" : "Guests"} (Max {details.allowedGuests} allowed)
                          </div>
                        </div>
                      </div>
                    ) : details.status === "DECLINED" ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                          <XCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <div className="text-[11px] text-zinc-500 font-mono font-medium">DECLINATION CONFIRMED</div>
                          <div className="text-xs text-zinc-400">You indicated you will not be attending.</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div>
                          <div className="text-[11px] text-zinc-500 font-mono">PENDING RESPONSE</div>
                          <div className="text-xs text-zinc-400">Please record your invitation choice.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!isEventEnded && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="primary"
                    className="w-full py-3 flex items-center justify-center gap-2 group"
                  >
                    Change RSVP Response
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
          SECURE ENCRYPTED RESPONSE LINK • PLANO.HI SYSTEMS
        </div>
      </div>
    </div>
  );
};
