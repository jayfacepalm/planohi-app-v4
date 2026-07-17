# Sprint 15: Google AdSense Monetization Integration

This sprint details the plan for introducing Google AdSense advertisements subtly into the event planner web app, whitelisting AdSense domains in Content Security Policies (CSP), establishing publisher validation (`ads.txt`), and preparing an ad-blocker fallback component that redirects users to the Premium upgrade flow.

---

## 1. Goals

1. **AdSense Script Integration**: Load the default Google AdSense client script loader asynchronously inside the root document layout to establish the publisher verification handshake.
2. **Subtle Neon-Border Styling**: Place ads inside dedicated, theme-conforming container panels characterized by low-contrast `[SPONSOR]` text tags and thin border outlines matching the active tab theme (purple or cyan).
3. **Responsive Ad Placement**:
   - **Footer Ad**: Integrate a horizontal responsive banner directly above the page footer in the events dashboard workspace layout.
   - **Dashboard Card Ad**: Embed a vertical square-proportioned ad unit at the end of the events page catalog list.
4. **Ad-Blocker Detection & Fallback**: Integrate real-time checks to verify if the AdSense script is blocked. If an active blocker is detected, immediately switch rendering to a themed fallback box advertising: *"Upgrade to Premium for an ad-free workspace and unlimited planning options!"*
5. **Ownership Verification (`ads.txt`)**: Set up a placeholder `ads.txt` static endpoint at the root domain namespace.
6. **Premium & Admin Ad Bypass**: Protect the premium user experience by automatically hiding ad containers (`AdSlot`) when the authenticated account is verified as `PREMIUM` or `ADMIN`.
7. **Hydration Safeguard**: Structure ad rendering to execute only post-client mounting, preventing React hydration mismatch errors in Next.js.

---

## 2. User Stories

* **US-15.1 (Subtle Ad Integration)**: As a visitor or organizer, when viewing event dashboard pages, I want to see subtle, themed sponsor banners styled to match the Cyberpunk design system so that ads feel integrated rather than intrusive.
* **US-15.2 (Publisher Verification)**: As a site owner, I want the platform to serve an `ads.txt` file at the root path `/ads.txt` so that Google can automatically verify my ownership of the domain.
* **US-15.3 (Ad-Blocker Fallback Upgrade Promotion)**: As an organizer running an ad-blocker, when an ad fails to load, I want to see a styled card promoting the Premium upgrade voucher option rather than an empty, broken space.
* **US-15.4 (Ad-Free Premium Tier)**: As a premium subscriber or administrator, I want to navigate the application without loading any advertisement scripts or displaying placeholder elements.

---

## 3. Database Schema & Migration

* **N/A** — This sprint is entirely frontend and web-proxy based. No backend database tables or migrations are required.

---

## 4. Backend Technical Implementation

* **N/A** — All logic runs inside the Next.js frontend application and proxy middleware headers.

---

## 5. Technical Implementation Details

### 1. Whitelisting Domains in Content Security Policy (CSP)

#### Frontend Middleware updates in [proxy.ts](/planohi-app-v4/web/proxy.ts)
Update the dynamic Content-Security-Policy (CSP) headers to permit Google AdSense script execution, styling, and frame embedding:
* Whitelist script sources: `https://pagead2.googlesyndication.com` and `https://adservice.google.com`.
* Whitelist frame/iframe sources: `https://googleads.g.doubleclick.net` and `https://tpc.googlesyndication.com`.

#### Infrastructure Updates in [ecs.tf](/planohi-app-v4/infra/terraform/ecs.tf)
Update the environment variables injected into the Next.js container:
* Extend `CSP_ALLOWED_CONNECT_SOURCES` to include `https://pagead2.googlesyndication.com`.
* Extend `CSP_ALLOWED_IMAGE_SOURCES` to include `https://pagead2.googlesyndication.com` and `https://googleads.g.doubleclick.net`.

#### Local Configuration updates in `.env` and `.env.example`
Append the new domains to the respective local variables:
```bash
CSP_ALLOWED_CONNECT_SOURCES="'self' ws: wss: https://pagead2.googlesyndication.com"
CSP_ALLOWED_IMAGE_SOURCES="'self' data: blob: https://planohi-banners-prod.s3.amazonaws.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net"
```

---

### 2. Google AdSense script injection
Import Next.js `Script` component inside the HTML head of the global Next.js root [layout.tsx](/planohi-app-v4/web/app/layout.tsx):
```typescript
import Script from "next/script";

// Inside RootLayout:
const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "pub-0000000000000000";
return (
  <html lang="en">
    <head>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
    </head>
    ...
```

---

### 3. Reusable AdSlot Component with AdBlocker & Premium Filters
Implement a client-side component [AdSlot.tsx](/planohi-app-v4/web/components/ui/AdSlot.tsx) to manage ad loading lifecycle, theme styling, premium exclusions, and blocker fallbacks:
```typescript
"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "./Button";
import { decodeRoleToken } from "../../lib/security";

interface AdSlotProps {
  slotId: string;
  userRole?: string;
  variant?: "horizontal" | "card";
}

export const AdSlot: React.FC<AdSlotProps> = ({ slotId, userRole, variant = "horizontal" }) => {
  const [mounted, setMounted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "pub-0000000000000000";

  // Check if account is PREMIUM or ADMIN to hide ads
  const decodedRole = userRole ? decodeRoleToken(userRole) : null;
  const isAdFreeUser = decodedRole === "PREMIUM" || decodedRole === "ADMIN";

  useEffect(() => {
    setMounted(true);
    if (isAdFreeUser) return;

    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      setIsBlocked(true);
    }
    
    // Verify script loaded successfully after 1.5 seconds
    const timer = setTimeout(() => {
      if (!(window as any).adsbygoogle?.loaded) {
        setIsBlocked(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [isAdFreeUser]);

  // Render absolutely nothing for Premium or Admin tiers
  if (isAdFreeUser) {
    return null;
  }

  // Prevent SSR Hydration mismatches by waiting until client mount
  if (!mounted) {
    return (
      <div className={`bg-[#09090b] rounded-xl border border-white/5 animate-pulse ${
        variant === "card" ? "h-full min-h-[250px]" : "w-full min-h-[90px]"
      }`} />
    );
  }

  if (isBlocked) {
    return (
      <div className={`border border-neon-purple/20 bg-[#121214]/65 rounded-xl p-4 text-center space-y-3 relative overflow-hidden ${
        variant === "card" ? "h-full flex flex-col justify-center" : ""
      }`}>
        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">[Support detected]</div>
        <p className="text-xs text-zinc-400">Upgrade to Premium to remove ads and unlock unlimited coordinate boards.</p>
        <Link href="/activate-voucher">
          <Button variant="gradient" className="px-3.5 py-1.5 text-[10px] h-auto mt-2">Glow Premium</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={`border border-white/5 bg-[#09090b] rounded-xl p-3 relative ${
      variant === "card" ? "h-full flex items-center justify-center min-h-[250px]" : "w-full min-h-[90px]"
    }`}>
      <div className="absolute top-1 left-2 text-[8px] font-mono text-zinc-650 uppercase tracking-wider">[Sponsor]</div>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={pubId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};
```

---

### 4. Integration Coordinates
* **Global Footer Layout**: Map `<AdSlot variant="horizontal" slotId="footer-ad-slot-id" userRole={role} />` directly above the footer navigation in [layout.tsx](/planohi-app-v4/web/app/events/layout.tsx).
* **Workspace Dashboard List**: Render `<AdSlot variant="card" slotId="dashboard-card-slot-id" userRole={userRole} />` inside the list mapping loops in [page.tsx](/planohi-app-v4/web/app/events/page.tsx).

---

## 6. Verification Plan

### Automated Build Verification:
- Run `npm run build` on the frontend `web/` module workspace to confirm successful TypeScript compiler checks.

### Manual Behavior Tests:
1. **Verification File**: Request `http://localhost:3000/ads.txt` in a browser. Check that the verifier file returns status 200 containing your publisher ID.
2. **Ad-Blocker Failover**: Load the dashboard list page with an active ad blocker. Verify that the ad box disappears and is cleanly replaced by the Premium promotion card linking to `/activate-voucher`.
3. **Premium Ad Bypass**: Log in as an Admin or Premium account. Confirm that the `AdSlot` components are bypassed entirely and do not inject the Google scripts or occupy any screen spacing.
