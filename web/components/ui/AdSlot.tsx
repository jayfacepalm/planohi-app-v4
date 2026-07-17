"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "./Button";
import { decodeRoleToken } from "../../lib/security";

interface AdSlotProps {
  slotId: string;
  userRole?: string;
  variant?: "horizontal" | "card";
  pubId?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ slotId, userRole, variant = "horizontal", pubId: propPubId }) => {
  const [mounted, setMounted] = useState(false);
  const [hasLoadedAd, setHasLoadedAd] = useState(false);
  const insRef = useRef<HTMLModElement>(null);
  const pubId = propPubId || process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "pub-0000000000000000";

  // Check if account is PREMIUM or ADMIN to hide ads
  const getRole = () => {
    if (!userRole) return null;
    if (userRole.includes(".")) {
      return decodeRoleToken(userRole);
    }
    return userRole;
  };
  const role = getRole();
  const isAdFreeUser = role === "PREMIUM" || role === "ADMIN";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isAdFreeUser) return;

    // Trigger AdSense loader array push after a small timeout to let the container layout render fully
    const pushTimer = setTimeout(() => {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        // Safe catch, defaults to fallback UI
      }
    }, 150);

    const targetNode = insRef.current;
    if (!targetNode) return;

    // Watch for attributes change to immediately detect loaded ad status
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-ad-status") {
          const status = targetNode.getAttribute("data-ad-status");
          if (status === "filled") {
            setHasLoadedAd(true);
          }
        }
      });
    });

    observer.observe(targetNode, { attributes: true });

    // Fallback scanner: Check status attribute periodically (every 200ms)
    const checkInterval = setInterval(() => {
      const status = targetNode.getAttribute("data-ad-status");
      if (status === "filled") {
        setHasLoadedAd(true);
        clearInterval(checkInterval);
      }
    }, 200);

    return () => {
      clearTimeout(pushTimer);
      observer.disconnect();
      clearInterval(checkInterval);
    };
  }, [mounted, isAdFreeUser]);

  // Render absolutely nothing for Premium or Admin tiers
  if (isAdFreeUser) {
    return null;
  }

  // Prevent SSR Hydration mismatches by waiting until client mount
  if (!mounted) {
    return (
      <div className={`bg-[#09090b]/80 rounded-xl border border-white/5 animate-pulse ${
        variant === "card" ? "h-full min-h-[250px]" : "w-full min-h-[90px]"
      }`} />
    );
  }

  // If in local development, render a beautiful preview card instead of a blank container
  if ((process.env.NODE_ENV as string) === "development") {
    return (
      <div className={`border border-dashed border-neon-cyan/30 bg-[#09090b] rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden ${
        variant === "card" ? "h-full min-h-[250px]" : "w-full min-h-[90px]"
      }`}>
        <div className="absolute top-1 left-2 text-[8px] font-mono text-neon-cyan/60 uppercase tracking-wider">[Sponsor Preview]</div>
        <div className="text-center space-y-1.5 z-10">
          <div className="text-xs font-heading font-semibold text-zinc-350">Google AdSense Placement</div>
          <div className="text-[9px] font-mono text-zinc-500 uppercase">Slot ID: {slotId} • Client: {pubId}</div>
          <p className="text-[9px] text-zinc-500 max-w-md mx-auto leading-relaxed">
            Test mode active. Real advertisements will load here when compiled on production host domains.
          </p>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
      hasLoadedAd 
        ? "border border-white/5 bg-[#09090b] p-3" 
        : "border border-neon-purple/20 bg-[#121214]/65 p-4 text-center"
    } ${
      variant === "card" ? "h-full flex flex-col justify-center min-h-[250px]" : "w-full min-h-[90px]"
    }`}>
      
      {/* 1. Premium Upgrade Content (Visible ONLY when no ad has successfully loaded) */}
      {!hasLoadedAd && (
        <div className="space-y-3 flex flex-col items-center justify-center h-full animate-in fade-in duration-300">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            [Plano.hi Premium]
          </div>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Upgrade to Premium to remove ads and unlock unlimited coordinate boards.
          </p>
          <Link href="/activate-voucher">
            <Button variant="gradient" className="px-3.5 py-1.5 text-[10px] h-auto mt-2 cursor-pointer">
              Glow Premium
            </Button>
          </Link>
        </div>
      )}

      {/* 2. Google Ad Container (Mounted to background to load, but hidden until filled) */}
      <div className={hasLoadedAd ? "block w-full h-full" : "absolute inset-0 opacity-0 pointer-events-none w-full h-full"}>
        {hasLoadedAd && (
          <div className="absolute top-1 left-2 text-[8px] font-mono text-zinc-600 uppercase tracking-wider">[Sponsor]</div>
        )}
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={pubId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
          data-ad-test={(process.env.NODE_ENV as string) === "development" ? "on" : "off"}
        />
      </div>

    </div>
  );
};
