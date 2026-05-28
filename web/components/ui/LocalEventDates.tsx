"use client";

import React, { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

interface LocalEventDatesProps {
  startDate: string;
  endDate: string;
}

export const LocalEventDates: React.FC<LocalEventDatesProps> = ({ startDate, endDate }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span className="text-[11px] text-neon-cyan font-mono font-medium tracking-wide flex items-center gap-1 opacity-0">
        <Calendar className="w-3.5 h-3.5" />
        Loading...
      </span>
    );
  }

  const format = (dStr: string) => {
    return new Date(dStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  const startFormatted = format(startDate);
  const endFormatted = format(endDate);

  return (
    <span className="text-[11px] text-neon-cyan font-mono font-medium tracking-wide flex items-center gap-1">
      <Calendar className="w-3.5 h-3.5" />
      {startFormatted === endFormatted ? startFormatted : `${startFormatted} - ${endFormatted}`}
    </span>
  );
};
