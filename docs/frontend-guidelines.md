# Next.js Frontend Development Guidelines

This document establishes the architecture, folder structure, and coding standards for the frontend of **planohi-app-v4**. 

> [!NOTE]
> For details on colors, fonts, CSS variables, and implementing the neon modern cursor-following cards, see the [Design System Guidelines](./design-system.md).

---

## 1. Directory Structure

All frontend code lives in the `web/` subdirectory.

```text
web/
├── app/                  # Next.js App Router
│   ├── (auth)/          # Authentication grouping (login, register)
│   ├── (protected)/     # Authenticated user pages (dashboard, events)
│   ├── api/             # API Route Handlers
│   │   └── proxy/
│   │       └── [...path]/ # Catch-all dynamic path routing
│   │           └── route.ts # Wildcard proxy route handler
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Landing page
├── components/          # Reusable React components (small & modular)
│   ├── ui/              # Atom-level design primitives (Button, Input, Card)
│   └── features/        # Feature-specific components (EventCard, ProfileForm)
├── hooks/               # Custom React hooks
├── proxy.ts             # Next.js Middleware (replaces middleware.ts)
├── public/              # Static assets (images, fonts, SVG icons)
└── styles/              # Global styles and Tailwind configuration
```

---

## 2. Next.js Routing Conventions

### Layouts (`layout.tsx`)
- Standardized UI wrappers (e.g. sidebars, navbar headers, context providers).
- Avoid placing heavy data fetching or local interactive states directly in root layouts to prevent re-rendering child page trees.

### Loading States (`loading.tsx`)
- Every page segment should have a corresponding `loading.tsx` file in its directory.
- Use skeletal loader designs that mimic the exact geometry of the content cards.
- Implement CSS-based shimmer animations for a premium, fast loading feel:
  ```css
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  ```

### Error Handling (`error.tsx`)
- Define page-level and section-level error boundaries using `error.tsx`.
- Must contain a `"use client"` directive, a visual explanation of the error, and a "Try Again" recovery action.
- Log error boundaries outputs to an observability service (or proxy back to the Java logging infrastructure).

---

## 3. Request Middleware (`proxy.ts`) & Routing (`route.ts`)

Next.js routes requests to the Spring Boot backend using Route Handlers (`route.ts`), while request verification and security decoration is handled by the middleware (`proxy.ts`).

### Middleware (`proxy.ts`)
- In this setup, `proxy.ts` serves as the Next.js middleware file (replacing the deprecated `middleware.ts` naming convention).
- It intercepts incoming page and API requests, reads the secure HTTP-only `auth_token` cookie, validates the session, and redirects unauthenticated users to `/login`.
- It decorates request headers before requests are passed down to routing handlers or pages.

### Backend Routing Handler (`app/api/proxy/route.ts`)
Clients call local API route handlers (e.g. `GET /api/proxy/events`), which execute downstream communication to the Spring Boot backend.

Example implementation structure for `app/api/proxy/[...path]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

export async function handleProxy(req: NextRequest) {
  const url = new URL(req.url);
  const backendPath = url.pathname.replace('/api/proxy', '');
  const searchParams = url.search;
  
  const token = req.cookies.get('auth_token')?.value;

  const headers = new Headers(req.headers);
  headers.set('Host', new URL(BACKEND_URL).host);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(`${BACKEND_URL}${backendPath}${searchParams}`, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.blob() : undefined,
    });

    const data = await res.blob();
    return new NextResponse(data, {
      status: res.status,
      headers: res.headers,
    });
  } catch (error) {
    console.error('Proxy request failed:', error);
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
  }
}

export { handleProxy as GET, handleProxy as POST, handleProxy as PUT, handleProxy as DELETE };
```

---

## 4. Component Reusability & Standards

1. **Keep Components Small**: Break views down into atomic blocks. If a component exceeds 150 lines of code, evaluate it for extraction.
2. **Strict Props Interfaces**: Always define clear TypeScript interfaces for all components. Do not use `any`.
3. **Avoid State Duplication**: Share state using React Context, URL search params, or server-side URL routing rather than duplicating local states.
4. **Server Components by Default & page.tsx Rule**:
   - **Every `page.tsx` must be a Server Component**: Never place the `"use client"` directive in a `page.tsx` file.
   - **Isolate Client Components**: Create separate, modular files for any client-side interactivity, state handling, hooks (e.g. `useState`), or browser events. Mark them with `"use client"` and import them into the parent `page.tsx` container.

---

## 5. State Management & Form Validation Guidelines

### URL-Driven UI State
- **Primary Page Filters**: All filtering, searching, tab selections, and list pagination must be stored in the URL search parameters (e.g. `/events?search=meeting&page=2&status=active`).
- **Benefits**: This ensures page views remain link-shareable, support back/forward browser history out of the box, and allows Next.js Server Components to read variables directly via standard page props (`searchParams`), fetching data on the server without client state hooks.
- **Client Components Navigation**: To mutate URL state, client components must use Next.js `useRouter` or `usePathname` utilities to push updated search parameters.

### Validation & Form Error Mappings
When the backend returns a `400 Bad Request` containing field validation anomalies:
1. **Response Structure**: The Spring Boot backend maps validation anomalies using standard Problem Details payloads (RFC 7807) listing invalid fields and descriptions:
   ```json
   {
     "status": 400,
     "title": "Constraint Violation",
     "errors": {
       "title": "Title cannot be blank",
       "eventDate": "Event date must be in the future"
     }
   }
   ```
2. **Client-Side Validation (Zod)**:
   - All forms must use **Zod** schemas for client-side input validation. Define schemas to enforce constraints (e.g. string lengths, format checks, date boundaries) before submitting payloads.
   - Integrate Zod schemas with forms using `react-hook-form` and the `@hookform/resolvers/zod` resolver.
3. **Propagating Errors**:
   - The Next.js catch-all `route.ts` forwards any `400` validation errors from the backend.
   - Client forms must merge these backend constraint violations alongside client-side Zod errors, mapping the error keys to form fields to display red highlight borders and descriptive warnings.

### Shared HTTP API Client (`web/lib/api-client.ts`)
To prevent code duplication, all Server Components, Route Handlers, and Client Components must perform queries via a unified fetch client wrapper:

```typescript
type RequestConfig = RequestInit & {
  params?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any) {
    super(data?.detail || "An API error occurred");
    this.status = status;
    this.data = data;
  }
}

export async function fetchApi<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const isServer = typeof window === 'undefined';
  
  // 1. Resolve base url (Server calls backend internally; client calls local proxy)
  const baseUrl = isServer 
    ? (process.env.BACKEND_API_URL || 'http://api:8080') 
    : '/api/proxy';

  const url = new URL(`${baseUrl}${path}`);
  
  // 2. Append query parameters
  if (config.params) {
    Object.entries(config.params).forEach(([key, val]) => url.searchParams.append(key, val));
  }

  const headers = new Headers(config.headers);
  if (!headers.has('Content-Type') && !(config.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url.toString(), {
    ...config,
    headers,
  });

  if (!res.ok) {
    let errorData = null;
    try {
      errorData = await res.json();
    } catch {
      errorData = { detail: res.statusText };
    }
    throw new ApiError(res.status, errorData);
  }

  // 204 No Content handling
  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}
```


