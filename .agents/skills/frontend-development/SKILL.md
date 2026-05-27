---
name: frontend-development
description: Guidelines and rules for building/updating the Next.js App Router frontend. Use this when writing React pages, layouts, reusable components, error or loading screens, or setting up native proxying.
---

# Next.js Frontend Development Skill

Use this skill when developing frontend code for the React/Next.js application.

> [!IMPORTANT]
> All interface styles and neon elements must strictly adhere to the [Design System Guidelines](../../../docs/design-system.md).

## Core Tech Stack
- **Framework**: Next.js (latest version) with App Router.
- **Routing**: Folder-based routing using App Router conventions.
- **Styling**: Modern CSS / Tailwind CSS. Use clean, Harmonious styles and avoid browser defaults.

## Request Middleware (`proxy.ts`) and Routing (`route.ts`)
1. **Middleware (`proxy.ts`)**:
   - `proxy.ts` is the middleware file (replacing the deprecated `middleware.ts`).
   - It intercepts incoming page and API requests to read and validate the `auth_token` cookie.
   - It verifies user sessions, redirects unauthenticated requests to `/login`, and decorates request headers with user details/bearer tokens.
2. **Backend API Routing (`[...path]/route.ts`)**:
   - Use a single catch-all Route Handler located at `web/app/api/proxy/[...path]/route.ts` to intercept all backend-destined requests.
   - This catch-all route parses the dynamic path parameter, appends the bearer token validation from the middleware, and forwards the payload directly to the Java Spring Boot backend services, avoiding the need to create redundant route files for every API endpoint.

## Layout, Loading, and Error Conventions
To provide a premium and fluid user experience, the agent must systematically utilize:
- **`layout.tsx`**: Define structural layouts (header, footer, sidebar, and workspace containers) to share state and layout elements across pages.
- **`loading.tsx`**: Always create a loading placeholder/skeleton view at the route folder level to enable React Suspense streaming and prevent layout shifts.
- **`error.tsx`**: Add error boundaries at major route levels to catch runtime exceptions and render recovery buttons instead of crashing the app.

## Component Design and Code Reusability
- **Small, Single-Responsibility Components**: Break pages down into compact components in the components folder. Avoid writing large monolith component files.
- **Client vs. Server Components**:
  - **`page.tsx` files must always be Server Components**: Under no circumstances should `page.tsx` contain the `"use client"` directive. They must fetch data on the server or serve as the layout container.
  - **Separation of Client Components**: Place all client-side interactivity, state management, and user input elements into distinct client components (marked with `"use client"`) inside the components directory, and import them into `page.tsx`.
- **No Duplication**: Centralize common logic (e.g. formatters, API hooks, input elements, buttons) inside dedicated utilities or shared UI components.

## State and Form Validation rules
- **URL-Driven state**: Use URL Search Params (e.g., `?search=xyz`) for UI variables such as search, pagination, active tabs, and filtering. This keeps the state Server Component friendly.
- **Client-Side Zod Validation**: All client forms must define schemas using **Zod** and utilize `react-hook-form` with the `@hookform/resolvers/zod` resolver for client-side field validation.
- **Form Validation Mapping**: Capture backend `400 Bad Request` validation payloads and map the error dictionary to specific form input field warnings, highlighting failed fields in red alongside Zod errors.
- **Shared API Client**: Always use the custom fetch wrapper (`web/lib/api-client.ts`) for data querying to prevent duplicate fetch calls, dynamic header resolving, and centralize exception throws.
