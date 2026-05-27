"use client";

import React, { useRef, useState } from "react";

interface OTPInputProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value = "",
  onChange,
  className = "",
  disabled = false
}) => {
  const [digits, setDigits] = useState<string[]>(() => {
    const initial = Array(6).fill("");
    for (let i = 0; i < Math.min(6, value.length); i++) {
      initial[i] = value[i];
    }
    return initial;
  });

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const nextDigits = Array(6).fill("");
    for (let i = 0; i < Math.min(6, value.length); i++) {
      nextDigits[i] = value[i];
    }
    setDigits(nextDigits);
  }

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, val: string) => {
    // Only allow numbers
    const cleanVal = val.replace(/[^0-9]/g, "");
    if (!cleanVal) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      setDigits(nextDigits);
      if (onChange) onChange(nextDigits.join(""));
      return;
    }

    // Take the last character typed
    const singleChar = cleanVal.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = singleChar;
    setDigits(nextDigits);
    
    const nextOTP = nextDigits.join("");
    if (onChange) onChange(nextOTP);

    // Auto-focus next input
    if (index < 5 && singleChar) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Focus previous and clear
        inputRefs.current[index - 1]?.focus();
        const nextDigits = [...digits];
        nextDigits[index - 1] = "";
        setDigits(nextDigits);
        if (onChange) onChange(nextDigits.join(""));
      } else {
        // Clear current
        const nextDigits = [...digits];
        nextDigits[index] = "";
        setDigits(nextDigits);
        if (onChange) onChange(nextDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pastedText = e.clipboardData.getData("text").trim();
    const cleanText = pastedText.replace(/[^0-9]/g, "").slice(0, 6);
    if (!cleanText) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      if (i < cleanText.length) {
        nextDigits[i] = cleanText[i];
      }
    }
    setDigits(nextDigits);

    const nextOTP = nextDigits.join("");
    if (onChange) onChange(nextOTP);

    // Focus last filled or next empty
    const focusIndex = Math.min(5, cleanText.length);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className={`flex gap-3 justify-center items-center ${className}`}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${idx + 1} of 6`}
          disabled={disabled}
          className={`w-12 h-14 text-center font-mono text-xl font-bold bg-[#121214] text-white border rounded-xl transition-all outline-none select-none
            ${digit ? "border-neon-purple/80 shadow-[0_0_12px_rgba(168,85,247,0.15)]" : "border-white/10"}
            focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.25)] focus:scale-105
            disabled:opacity-40 disabled:scale-100 disabled:shadow-none disabled:border-white/5
          `}
        />
      ))}
    </div>
  );
};
