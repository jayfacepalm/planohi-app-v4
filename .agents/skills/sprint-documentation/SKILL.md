---
name: sprint-documentation
description: Guidelines and rules for writing, structuring, and maintaining Sprint Specification documents in docs/sprints/. Use this when creating new sprint spec documents or updating existing sprint goals, user stories, database schemas, API specs, and verification plans.
---

# Sprint Documentation Authoring Skill

Use this skill when drafting, updating, or reviewing sprint specification documents in `docs/sprints/`.

## Document Naming & Title Conventions
1. **File Location**: All sprint specifications reside in `docs/sprints/`.
2. **File Naming Pattern**: `sprint-<N>.md` (e.g., `sprint-1.md`, `sprint-16.md`). Always use lowercase with a hyphen and sequential integer `<N>`.
3. **Document Title (H1)**: `# Sprint <N>: <Descriptive Domain/Feature Title>` (e.g. `# Sprint 1: Security & Authentication Canvas`, `# Sprint 15: Google AdSense Monetization Integration`).
4. **Sprint Summary Lead**: Immediately following the title line, include a 1-2 sentence lead paragraph outlining the core purpose and scope of the sprint. Use a horizontal divider (`---`) below the lead paragraph.

## Standard Document Structure & Section Breakdown

Every sprint document must strictly follow this ordered section structure:

```markdown
# Sprint <N>: <Title>

<Sprint summary lead paragraph>

---

## 1. Goal / Goals

<Numbered or bulleted list of high-level objectives>

---

## 2. User Stories

<Structured user stories formatted with US-N.M identifiers>

---

## 3. Database Schema & Migration

<PostgreSQL DDL SQL code blocks with UUID v7 PKs, TIMESTAMPTZ columns, BaseAuditEntity columns, explicit indexes>
<!-- Use "N/A" if no database changes exist -->

---

## 4. Backend REST APIs

<Detailed REST endpoints with URI, method, JSON payloads, logic behavior, response status codes>
<!-- Use "N/A" if no backend changes exist -->

---

## 5. Technical Implementation Details / Frontend Work

<Frontend components, Next.js routes, state management, middleware rules, infrastructure updates>

---

## 6. Verification Plan

### Automated Testing / Build Verification
<Unit tests, Spring event tests, Maven build commands, Next.js build verification>

### Manual Verification
<Step-by-step browser flows, feature validation, edge case verification>
```

## Section-by-Section Guidelines

### 1. Goals (`## 1. Goal` or `## 1. Goals`)
- State 1 to 7 concrete goals for the sprint.
- Keep objectives clear, measurable, and outcome-oriented (e.g., "Implement stateless JWT authentication", "Consolidate microservices into a modular monolith").

### 2. User Stories (`## 2. User Stories`)
- **Identifier Format**: Use `US-<SprintNumber>.<SubID>` (e.g., `US-1.1`, `US-1.2`, `US-16.1`).
- **Standard User Story Syntax**:
  `* **US-<N>.<M> (<Descriptive Title>)**: As a <role>, I want <feature/capability> so that <benefit/outcome>.`
- **Example**:
  `* **US-1.1 (Registration Initiation & OTP Request)**: As a registering event organizer, I want to fill in my email, alias, and password and press proceed to request a one-time password (OTP) so that a secure code is generated and cached for verification.`

### 3. Database Schema & Migration (`## 3. Database Schema & Migration`)
- Provide Flyway-compatible SQL DDL (`CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`).
- Primary Keys: Always use UUID version 7 (`UUID PRIMARY KEY DEFAULT gen_random_uuid()` or Hibernate UUID v7 generator).
- Timestamps: Always use **`TIMESTAMPTZ`** (or `TIMESTAMP WITH TIME ZONE`) instead of plain `TIMESTAMP`.
- Audit Columns: Include `created_at`, `updated_at`, `createdBy`, `updatedBy` for tables extending `BaseAuditEntity`.
- Indexes: Explicitly define indexes for foreign key lookups and search columns (`CREATE INDEX idx_<table_name>_<column_name> ON <table_name>(<column_name>);`).
- If no DB changes are required, explicitly state: `* **N/A** — This sprint is entirely frontend and web-proxy based. No backend database tables or migrations are required.`

### 4. Backend REST APIs (`## 4. Backend REST APIs`)
- Document each API endpoint with:
  - **Endpoint Name & Path**: `### <Number>. <Feature Name>` (e.g., `POST /api/auth/register`)
  - **Request Payload**: Provide clean JSON schema examples using fenced code blocks (`json`).
  - **Behavior**: Bullet points detailing validation, security checks, caching logic, database queries, and events published.
  - **Response Status**: State the HTTP status code (`200 OK`, `201 Created`, `204 No Content`, `400 Bad Request`).
- All response payloads must adhere to the `ApiResponse<T>` envelope (`{ "status": "SUCCESS" | "FAILED", "msg": "...", "result": ... }`).

### 5. Technical Implementation Details / Frontend Work (`## 5. Technical Implementation Details`)
- Detail component paths (`web/components/ui/`, `web/components/features/`), page routes (`web/app/...`), middleware rules (`web/proxy.ts`), and custom hooks.
- Use markdown file links to reference actual codebase files (e.g., `[AdSlot.tsx](/planohi-app-v4/web/components/ui/AdSlot.tsx)` or `[proxy.ts](/planohi-app-v4/web/proxy.ts)`).
- Document design system compliance (Cyber-Glow theme, `GlowCard`, `Button` variants, `Space Grotesk` / `Outfit` / `JetBrains Mono` fonts).

### 6. Architectural Decision Alerts & Trade-offs
- Use GitHub markdown alert boxes to highlight important architecture choices, breaking changes, or risks:
  ```markdown
  > [!IMPORTANT]
  > Key security boundaries or design mandates.

  > [!WARNING]
  > Trade-offs, risks, or performance implications.
  ```

### 7. Verification Plan (`## 6. Verification Plan`)
- Every sprint specification MUST end with a Verification Plan split into:
  1. `### Automated Testing` (or `### Automated Build Verification`): Commands and unit/integration test cases to run (`mvn clean install`, `npm run build`, `terraform validate`, specific test class names).
  2. `### Manual Verification` (or `### Manual Behavior Tests`): Step-by-step browser validation, error failover tests, and role permission checks.
