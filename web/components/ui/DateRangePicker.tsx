"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateRangePickerProps {
  onRangeChange?: (from: Date | null, to: Date | null) => void;
  className?: string;
  fromLabel?: string;
  toLabel?: string;
  align?: "top" | "bottom";
  minDate?: Date;
  maxDate?: Date;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  onRangeChange,
  className = "",
  fromLabel = "From",
  toLabel = "To",
  align = "bottom",
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Current calendar month view tracking (defaults to today's month)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside, pressing Escape key, or tabbing away
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.relatedTarget as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const formatDateLabel = (date: Date | null, placeholder: string) => {
    if (!date) return placeholder;
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  };

  const isDateDisabled = (date: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (minDate) {
      const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      if (d < min) return true;
    }
    if (maxDate) {
      const max = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
      if (d > max) return true;
    }
    return false;
  };

  const handleDayClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    if (!fromDate || (fromDate && toDate)) {
      setFromDate(date);
      setToDate(null);
      if (onRangeChange) onRangeChange(date, null);
    } else if (fromDate && !toDate) {
      if (date < fromDate) {
        setFromDate(date);
        if (onRangeChange) onRangeChange(date, null);
      } else {
        setToDate(date);
        setIsOpen(false);
        if (onRangeChange) onRangeChange(fromDate, date);
      }
    }
  };

  const handleMouseEnter = (date: Date) => {
    if (isDateDisabled(date)) return;
    if (fromDate && !toDate) {
      setHoveredDate(date);
    }
  };

  const handleMouseLeave = () => {
    setHoveredDate(null);
  };

  const changeMonth = (offset: number) => {
    let nextMonth = currentMonth + offset;
    let nextYear = currentYear;

    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }

    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
  };

  // Generate calendar days
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days: Date[] = [];

    // Day of the week of the first day (0 = Sunday, 6 = Saturday)
    const startDayOfWeek = date.getDay();

    // Previous month padding days
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(prevYear, prevMonth, daysInPrevMonth - i));
    }

    // Current month days
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }

    // Next month padding days to round up grid to multiple of 7
    const remainingDays = 42 - days.length;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(nextYear, nextMonth, i));
    }

    return days;
  };

  const daysGrid = getDaysInMonth(currentYear, currentMonth);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper styles determination
  const isDateSelected = (date: Date) => {
    const isFrom = fromDate && date.toDateString() === fromDate.toDateString();
    const isTo = toDate && date.toDateString() === toDate.toDateString();
    return { isFrom, isTo, isAny: isFrom || isTo };
  };

  const isDateInRange = (date: Date) => {
    if (!fromDate) return false;
    if (toDate) {
      return date > fromDate && date < toDate;
    }
    if (hoveredDate && date > fromDate && date <= hoveredDate) {
      return true;
    }
    return false;
  };

  return (
    <div ref={pickerRef} className={`relative w-full ${className}`}>

      {/* Target input trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left flex items-center justify-between bg-[#121214] border border-white/10 hover:border-neon-cyan/40 rounded-xl px-4 py-3 cursor-pointer select-none transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] focus:outline-none focus:border-neon-cyan/80 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
      >
        <div className="flex-1">
          <span className="text-[10px] text-zinc-500 font-heading block uppercase tracking-wider mb-0.5">
            {fromLabel}
          </span>
          <span className="text-sm font-sans font-medium text-white">
            {formatDateLabel(fromDate, "Select date")}
          </span>
        </div>
        <div className="w-[1px] h-8 bg-white/10 mx-4" />
        <div className="flex-1 text-right md:text-left">
          <span className="text-[10px] text-zinc-500 font-heading block uppercase tracking-wider mb-0.5">
            {toLabel}
          </span>
          <span className="text-sm font-sans font-medium text-white">
            {formatDateLabel(toDate, "Select date")}
          </span>
        </div>
      </button>

      {/* Dropdown Calendar Drawer */}
      {isOpen && (
        <div className={`absolute ${align === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"} left-0 z-30 w-full min-w-[320px] max-w-[360px] rounded-2xl border border-neon-purple/20 bg-[#121214] p-5 shadow-[0_15px_40px_-10px_rgba(168,85,247,0.25)] animate-in fade-in slide-in-from-top-2 duration-150`}>

          {/* Header Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="p-1.5 rounded-lg border border-white/5 hover:border-neon-purple/40 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-heading font-bold text-white tracking-wide">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="p-1.5 rounded-lg border border-white/5 hover:border-neon-purple/40 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-heading font-semibold text-zinc-500 mb-2">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {daysGrid.map((day, idx) => {
              const { isFrom, isTo, isAny } = isDateSelected(day);
              const inRange = isDateInRange(day);
              const isCurrentMonth = day.getMonth() === currentMonth;
              const isDisabled = isDateDisabled(day);

              // Formatting styles
              let btnStyles = "h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-all relative select-none ";

              if (isDisabled) {
                btnStyles += "text-zinc-800 opacity-40 cursor-not-allowed ";
              } else {
                btnStyles += "cursor-pointer ";
                if (!isCurrentMonth) {
                  btnStyles += "text-zinc-700 hover:text-zinc-500 ";
                } else {
                  btnStyles += "text-zinc-300 hover:text-white ";
                }

                if (isAny) {
                  btnStyles += "bg-neon-purple text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] z-10 ";
                } else if (inRange) {
                  btnStyles += "bg-neon-cyan/15 text-neon-cyan border-y border-neon-cyan/35 rounded-none first-of-type:rounded-l-lg last-of-type:rounded-r-lg ";
                } else {
                  btnStyles += "hover:bg-white/5 ";
                }
              }

              let dayStatus = "";
              if (isFrom) dayStatus = " - Start of date range";
              else if (isTo) dayStatus = " - End of date range";
              else if (inRange) dayStatus = " - Within selected range";
              if (isDisabled) dayStatus += " - Unavailable";

              const dayLabel = `${day.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}${dayStatus}`;

              return (
                <div key={idx} className="flex justify-center items-center py-0.5">
                  <button
                    type="button"
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => handleMouseEnter(day)}
                    onMouseLeave={handleMouseLeave}
                    aria-label={dayLabel}
                    disabled={isDisabled}
                    className={btnStyles}
                  >
                    {day.getDate()}
                    {/* Add small dots for indicators if needed */}
                    {isFrom && !toDate && !isDisabled && (
                      <span className="absolute bottom-1 w-1 h-1 bg-neon-cyan rounded-full animate-ping" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="border-t border-white/5 mt-4 pt-3 flex items-center justify-between text-xs text-zinc-400">
            <span>
              {fromDate && !toDate ? "Choose check-out date" : "Select date range"}
            </span>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate(null);
                  setToDate(null);
                  if (onRangeChange) onRangeChange(null, null);
                }}
                className="text-neon-cyan hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
