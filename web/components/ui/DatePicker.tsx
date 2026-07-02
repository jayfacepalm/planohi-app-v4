"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  selected?: Date | null;
  onChange?: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  align?: "top" | "bottom";
  minDate?: Date;
  maxDate?: Date;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  selected,
  onChange,
  label = "Date",
  placeholder = "Select date",
  className = "",
  align = "bottom",
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalDate, setInternalDate] = useState<Date | null>(selected || null);
  const [prevSelected, setPrevSelected] = useState<Date | null | undefined>(selected);
  const [mounted, setMounted] = useState(false);

  // Time States
  const [selectedHour, setSelectedHour] = useState(selected ? selected.getHours() : 0);
  const [selectedMinute, setSelectedMinute] = useState(selected ? selected.getMinutes() : 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state with props during render phase to avoid effect-based cascades
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    setInternalDate(selected || null);
    if (selected) {
      setSelectedHour(selected.getHours());
      setSelectedMinute(selected.getMinutes());
    } else {
      setSelectedHour(0);
      setSelectedMinute(0);
    }
  }

  // Current calendar month view tracking (defaults to selected date or today's month)
  const baseDate = selected || internalDate || new Date();
  const [currentYear, setCurrentYear] = useState(baseDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(baseDate.getMonth());

  const pickerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside, pressing Escape key, or tabbing away
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = pickerRef.current && pickerRef.current.contains(target);
      const clickedCalendar = calendarRef.current && calendarRef.current.contains(target);
      if (!clickedTrigger && !clickedCalendar) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.relatedTarget as Node;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        (!calendarRef.current || !calendarRef.current.contains(target))
      ) {
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

  // Lock body scroll when calendar modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      const activeDialogs = document.querySelectorAll('[role="dialog"]');
      if (activeDialogs.length <= 1) {
        document.body.style.overflow = "";
      }
    };
  }, [isOpen]);

  const formatDateLabel = (date: Date | null, ph: string) => {
    if (!date) return ph;
    if (!mounted) return ph; // Prevent Next.js hydration mismatch
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
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

  const updateDateTime = (baseDate: Date | null, hr: number, min: number) => {
    if (!baseDate) return null;
    const d = new Date(baseDate);
    d.setHours(hr, min, 0, 0);
    return d;
  };

  const handleDayClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    const newDate = updateDateTime(date, selectedHour, selectedMinute);
    setInternalDate(newDate);
    if (onChange && newDate) onChange(newDate);
  };

  const handleHourChange = (hr: number) => {
    setSelectedHour(hr);
    if (internalDate) {
      const newDate = updateDateTime(internalDate, hr, selectedMinute);
      setInternalDate(newDate);
      if (onChange && newDate) onChange(newDate);
    }
  };

  const handleMinuteChange = (min: number) => {
    setSelectedMinute(min);
    if (internalDate) {
      const newDate = updateDateTime(internalDate, selectedHour, min);
      setInternalDate(newDate);
      if (onChange && newDate) onChange(newDate);
    }
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

  const isDateSelected = (date: Date) => {
    return internalDate && date.toDateString() === internalDate.toDateString();
  };

  const calendarContent = (
    <>
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
          const isSelected = isDateSelected(day);
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

            if (isSelected) {
              btnStyles += "bg-neon-purple text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] z-10 ";
            } else {
              btnStyles += "hover:bg-white/5 ";
            }
          }

          const dayLabel = `${day.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          })}${isSelected ? " - Selected date" : ""}${isDisabled ? " - Unavailable" : ""}`;

          return (
            <div key={idx} className="flex justify-center items-center py-0.5">
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                aria-label={dayLabel}
                disabled={isDisabled}
                className={btnStyles}
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>

      {/* Time Selector Section */}
      <div className="border-t border-white/5 mt-4 pt-3 flex items-center justify-between">
        <span className="text-xs text-zinc-400 font-heading">Set Time</span>
        <div className="flex items-center gap-1.5 font-mono text-xs text-white">
          <select
            value={selectedHour}
            onChange={(e) => handleHourChange(Number(e.target.value))}
            className="bg-[#070708] border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-neon-cyan text-white text-xs cursor-pointer"
          >
            {Array.from({ length: 24 }).map((_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}
              </option>
            ))}
          </select>
          <span>:</span>
          <select
            value={selectedMinute}
            onChange={(e) => handleMinuteChange(Number(e.target.value))}
            className="bg-[#070708] border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-neon-cyan text-white text-xs cursor-pointer"
          >
            {Array.from({ length: 60 }).map((_, m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="border-t border-white/5 mt-4 pt-3 flex items-center justify-between text-xs">
        {internalDate ? (
          <button
            type="button"
            onClick={() => {
              setInternalDate(null);
              setSelectedHour(0);
              setSelectedMinute(0);
              if (onChange) onChange(null);
            }}
            className="text-red-400 hover:underline cursor-pointer"
          >
            Clear
          </button>
        ) : (
          <span className="text-zinc-500">Choose date and time</span>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-neon-cyan hover:underline cursor-pointer font-medium"
        >
          Done
        </button>
      </div>
    </>
  );

  return (
    <div ref={pickerRef} className={`relative w-full ${className}`}>

      {/* Target input trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left flex items-center justify-between bg-[#121214] border border-white/10 hover:border-neon-cyan/40 rounded-xl px-4 py-3 cursor-pointer select-none transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] focus:outline-none focus:border-neon-cyan/80 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
      >
        <div className="flex-1">
          {label && (
            <span className="text-[10px] text-zinc-500 font-heading block uppercase tracking-wider mb-0.5">
              {label}
            </span>
          )}
          <span className="text-sm font-sans font-medium text-white">
            {formatDateLabel(internalDate, placeholder)}
          </span>
        </div>
        <div className="text-zinc-500 hover:text-zinc-300">
          <Calendar className="w-4 h-4" />
        </div>
      </button>

      {/* Dropdown Calendar Drawer - Portaled Center Modal Overlay */}
      {isOpen && mounted && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in duration-100">
          <div ref={calendarRef} role="dialog" aria-modal="true" className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-[340px] rounded-2xl border border-neon-purple/20 bg-[#121214] p-4 shadow-[0_15px_50px_rgba(168,85,247,0.3)] animate-in zoom-in-95 duration-150">
            {calendarContent}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
