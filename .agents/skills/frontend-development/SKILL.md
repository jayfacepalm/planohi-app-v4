---
name: frontend-development
description: Guidelines and rules for building/updating the Next.js App Router frontend. Use this when writing React pages, layouts, reusable components, error or loading screens, or setting up native proxying.
---

# Next.js Frontend Development Skill

Use this skill when developing frontend code for the React/Next.js application (`/web`).

> [!IMPORTANT]
> All interface styles, dark theme rules, and neon elements must strictly adhere to the [Cyber-Glow Design System Guidelines](../../../docs/design-system.md).

## Core Tech Stack
- **Framework**: Next.js 16 (App Router with `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`).
- **React**: React 19 (`react`, `react-dom`).
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";` with `@theme` block in `web/app/globals.css`).
- **Icons**: Lucide React (`lucide-react`).
- **Form Management & Validation**: `react-hook-form` + `zod` (`@hookform/resolvers/zod`).
- **Typography**: Google Fonts loaded via `public/fonts/fonts-googleapis.css` (`Space Grotesk` for headings, `Outfit` for body, `JetBrains Mono` for code/data).

## Cyber-Glow Design System & Aesthetics
1. **Dark Cyber-Glow Aesthetics (Dark-Only)**:
   - **Base Canvas**: `#070708` (`var(--color-bg-dark)`).
   - **Container Surface**: `#121214` (`var(--color-bg-surface)`) / `#18181b`.
   - **Primary Accent (Neon Purple)**: `#a855f7` (`var(--color-neon-purple)`). Use for primary call-to-action buttons, active borders, and ambient glow shadows.
   - **Secondary Accent (Neon Cyan)**: `#06b6d4` (`var(--color-neon-cyan)`). Use for secondary buttons, interactive highlights, and focus outlines.
   - **Text Colors**: Primary high-contrast `#f4f4f5` / `#ffffff`, Muted `#a1a1aa` / `zinc-400` / `zinc-500`.
2. **Cursor-Tracking Glow Cards**:
   - Always wrap container cards in `GlowCard` (`web/components/ui/GlowCard.tsx`).
   - Cards dynamically compute `--mouse-x` and `--mouse-y` CSS properties on mouse movement to display a cursor-following radial gradient glow (`rgba(168,85,247,0.12)` core and `rgba(6,182,212,0.04)` tail).
3. **Neon Glow Buttons**:
   - Use `Button` (`web/components/ui/Button.tsx`) with variants:
     - `primary`: Neon purple with purple ambient glow (`shadow-[0_0_15px_rgba(168,85,247,0.35)]`).
     - `secondary`: Neon cyan background with dark text (`#070708`) for maximum WCAG contrast compliance.
     - `ghost`: Transparent background for neutral actions.
     - `danger`: Red background with red glow for destructive actions.
     - `gradient`: Gradient from neon purple to neon cyan.

## Component Architecture & Categorization
1. **Directory Organization**:
   - **`web/components/ui/`**: Reusable atomic UI elements (`Button`, `Input`, `TextArea`, `Checkbox`, `GlowCard`, `Modal`, `Badge`, `Skeleton`, `DatePicker`, `DateRangePicker`, `OTPInput`, `UploadFile`, `Navbar`, `Footer`, `AdSlot`, `LocalEventDates`).
   - **`web/components/features/`**: Feature-specific containers and business domain views (`LoginForm`, `RegisterForm`, `CreateEventModal`, `EditEventModal`, `EventsDashboardClient`, `EventDetailPageClient`, canvas views like `EventBudgetCanvas`, `EventGuestCanvas`, `EventTimelineCanvas`, `EventApprovalsCanvas`, `EventCuratorsCanvas`).
2. **Portal-Based Modals**:
   - Use `Modal` (`web/components/ui/Modal.tsx`) which renders overlays via `createPortal(..., document.body)`.
   - Modals enforce dark backdrop blur, body scroll locking, and `Escape` key dismissal.

## Server Components vs. Client Components
1. **`page.tsx` MUST be a Server Component**: Under no circumstances should `page.tsx` contain the `"use client"` directive. Pages handle initial data fetching on the server or act as structural layout containers.
2. **Interactive Client Components**: Place interactive state, hooks, event listeners, and form logic into distinct client components marked with `"use client"` in `components/features/` or `components/ui/`, and import them into `page.tsx`.

## API Client (`web/lib/api-client.ts`) & Request Routing
1. **Custom Fetch Wrapper (`fetchApi<T>`)**:
   - Always use `fetchApi<T>(path, config)` from `web/lib/api-client.ts` for data fetching.
   - **Server Execution Context**: Calls `BACKEND_API_URL` (e.g. `http://localhost:8080/api...`), injects `X-API-Key` and `X-Correlation-Id`.
   - **Client Execution Context**: Calls `/api/proxy...` catch-all route handler.
2. **Response Envelope Unwrapping**:
   - Backend APIs respond with a standard envelope: `{ status: "SUCCESS" | "FAILED", msg: string, result: T }`.
   - `fetchApi` automatically unwraps and returns `envelope.result` directly.
   - On error status or HTTP failure, it throws `ApiError(status, data)`.
3. **Event Role Token Management**:
   - Call `setRoleToken(token)` when entering event contexts.
   - Mutating requests (`POST`, `PUT`, `DELETE`, `PATCH`) automatically attach the `X-Event-Role-Token` header.

## Request Middleware (`proxy.ts`) & API Route Proxy
1. **Middleware (`proxy.ts`)**:
   - Named function `proxy(request: NextRequest)` matched across non-static routes (`matcher: ['/((?!api/proxy|_next/static|_next/image|favicon.ico).*)']`).
   - Validates `AUTH_TOKEN` cookie expiration using JWT payload decoding (`isTokenExpired`).
   - Route Protection:
     - Public routes: `/_next`, `/favicon.ico`, `/design-system`, `/rsvp/*`.
     - Unauthenticated requests to protected routes redirect to `/login` (clearing expired cookies).
     - Authenticated requests to `/`, `/login`, or `/register` redirect to `/events`.
   - Injects Content-Security-Policy (CSP) headers configured via `CSP_ALLOWED_IMAGE_SOURCES` and `CSP_ALLOWED_CONNECT_SOURCES`.
2. **Catch-All Proxy Route (`web/app/api/proxy/[...path]/route.ts`)**:
   - Intercepts client-side API requests, translates `/api/proxy` to `/api`, forwards `AUTH_TOKEN` cookies, `X-Correlation-Id`, and `X-API-Key` to the Spring Boot backend, and returns responses with `Cache-Control: no-store`.

## State & Form Validation Rules
1. **URL-Driven State**: Use URL search parameters (`searchParams`) for UI state like search inputs, active tabs, filters, and pagination (`DashboardPagination.tsx`).
2. **Client-Side Zod & React Hook Form**:
   - All forms must define validation schemas using `zod`.
   - Initialize forms with `useForm({ resolver: zodResolver(schema) })` and bind with `Input` (`web/components/ui/Input.tsx`).
3. **Backend Validation Error Mapping**:
   - Catch `ApiError` in form submit handlers.
   - Extract server field validation payloads (`err.data.result`) and map them using `setError(field, { type: "server", message })`.

## Layout, Loading, and Error Conventions
- **`layout.tsx`**: Defines persistent structural containers (navigation, workspace headers, sidebars).
- **`loading.tsx`**: Provides route-level skeleton views (`web/components/ui/Skeleton.tsx`) to enable React Suspense streaming.
- **`error.tsx`**: Provides route-level error boundaries with recovery reset buttons to prevent application crashes.
