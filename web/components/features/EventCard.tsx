"use client";

import React from "react";
import Link from "next/link";
import { GlowCard } from "../ui/GlowCard";
import { Badge } from "../ui/Badge";
import { ArrowRight } from "lucide-react";

interface EventItem {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  bannerUrl?: string;
  totalEstimatedCost: number;
  createdAt: string;
}

interface EventCardProps {
  event: EventItem;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const isSingleDay = () => {
    const start = formatDate(event.startDate);
    const end = formatDate(event.endDate);
    return start === end;
  };

  // Securely load the banner through Next.js proxy route
  const imageUrl = event.bannerUrl
    ? `/api/proxy/events/${event.id}/banner`
    : null;

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <GlowCard className="h-full border border-white/5 bg-[#121214] hover:shadow-[0_8px_30px_rgba(6,182,212,0.1)] transition-all duration-300">
        <div className="flex flex-col h-full justify-between">
          <div>
            {/* Banner Preview Zone */}
            {imageUrl ? (
              <div className="w-full aspect-video rounded-lg overflow-hidden border border-white/10 relative mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-lg border border-white/5 bg-gradient-to-br from-neon-purple/5 to-neon-cyan/5 flex items-center justify-center relative mb-4 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:15px_15px]" />
                <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">
                  No Banner Showcased
                </span>
              </div>
            )}

            {/* Event Meta */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-neon-cyan font-mono font-medium tracking-wide">
                {isSingleDay() ? (
                  formatDate(event.startDate)
                ) : (
                  `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`
                )}
              </span>
              <Badge variant="cyan" className="text-[9px] uppercase py-0.5 px-2">
                Active
              </Badge>
            </div>

            <h4 className="text-md font-heading font-bold text-white mb-2 leading-tight group-hover:text-neon-cyan transition-colors line-clamp-1">
              {event.title}
            </h4>

            {event.description ? (
              <p className="text-xs text-zinc-400 font-sans line-clamp-2 leading-relaxed mb-4">
                {event.description}
              </p>
            ) : (
              <p className="text-xs text-zinc-650 font-sans italic leading-relaxed mb-4">
                No description configured for this workspace...
              </p>
            )}
          </div>

          <div className="border-t border-white/5 pt-4 flex items-center justify-between mt-auto">
            <div>
              <span className="text-[9px] text-zinc-500 font-heading block uppercase tracking-wider mb-0.5">
                Estimated Budget
              </span>
              <span className="text-sm font-heading font-bold text-white">
                {formatCurrency(event.totalEstimatedCost || 0)}
              </span>
            </div>
            
            <div className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-neon-cyan group-hover:border-neon-cyan/40 transition-all duration-300">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </GlowCard>
    </Link>
  );
};
