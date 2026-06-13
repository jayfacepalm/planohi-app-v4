# Sprint 9: Chronological Spendings & Scheduled RSVP Invitations

This sprint implements a chronological spendings log with component labeling on the Budget Canvas, and adds a scheduled "Send All" invitation engine in the Guest Canvas using the Quartz Scheduler JDBC JobStore.

---

## 1. Goals

1. **Chronological Spendings Log**: Provide a unified, chronological list of all actual spendings for an event workspace (latest spendings first) as an alternative to viewing spendings grouped strictly under components.
2. **Scheduled RSVP Deliveries**: Implement immediate or scheduled bulk email invitations to all pending guests with configured email addresses.
3. **Quartz Scheduler Integration**: Configure the Spring Boot backend with Spring Quartz Scheduler using the Postgres JDBC JobStore to persist, cancel, or reschedule invitation tasks across application restarts.
4. **API Client Authenticity**: Secure the REST endpoints from direct external calls by enforcing a shared API Key check (`X-API-Key` header) inside the Spring Security filter chain on all `/api/**` endpoints, while allowing documentation and actuator paths to bypass.

---

## 2. User Stories

* **US-9.1 (Chronological Spendings Log)**: As an event organizer, I want to see a single chronological log of all actual expenditures across my entire event, so that I can audit latest transactions quickly without drilling down into individual components.
* **US-9.2 (Unified Spendings View switcher)**: As a user, I want a toggle switch in the Budget Canvas tab to switch between the component-based view and a chronological list view of all spendings.
* **US-9.3 (Immediate / Scheduled Bulk Invitations)**: As an event owner or organizer, I want a "Send All Invites" button in the Guest Canvas to trigger bulk invitation deliveries immediately or at a scheduled date/time, so that I don't have to manually click the invite button for each guest. Only OWNER and ORGANIZER roles are authorized.
* **US-9.4 (Schedule Management & Cancellation)**: As an event owner or organizer, when invitations are scheduled, I want to see the active scheduled date in the guest canvas and be able to cancel the delivery at any time before it triggers. Only OWNER and ORGANIZER roles are authorized.
* **US-9.5 (API Client Authenticity)**: As an administrator, I want the backend to reject any client API requests that do not carry a valid API Key in the `X-API-Key` header with HTTP 401 Unauthorized, ensuring that only requests originating from our Next.js frontend proxy/server are processed.

---

## 3. Technical & Database Design

### 1. Database Migrations (Flyway)
We will create a Flyway migration script `V20260607000100__create_quartz_tables.sql` to initialize standard Quartz tables in PostgreSQL for task persistence. The script will define the following standard tables:
* `QRTZ_JOB_DETAILS`
* `QRTZ_TRIGGERS`
* `QRTZ_SIMPLE_TRIGGERS`
* `QRTZ_CRON_TRIGGERS`
* `QRTZ_BLOB_TRIGGERS`
* `QRTZ_FIRED_TRIGGERS`
* `QRTZ_CALENDARS`
* `QRTZ_PAUSED_TRIGGER_GRPS`
* `QRTZ_SCHEDULER_STATE`
* `QRTZ_LOCKS`

### 2. Quartz Scheduler Config (`application.yaml`)
We will configure Spring Boot to use the JDBC JobStore with active clustering to prevent duplicate job execution in multi-instance load balancer deployments:
```yaml
spring:
  quartz:
    job-store-type: jdbc
    jdbc:
      initialize-schema: never
    properties:
      org.quartz.jobStore.driverDelegateClass: org.quartz.impl.jdbcjobstore.PostgreSQLDelegate
      org.quartz.jobStore.isClustered: true
      org.quartz.jobStore.clusterCheckinInterval: 20000
```

### 3. Clustering & Load Balancing Execution Safety
* **Locking Mechanism**: When running multiple API container instances, Quartz leverages row-level locks on the PostgreSQL `QRTZ_LOCKS` table to coordinate task execution. 
* **Duplicate Prevention**: Before a trigger fires, a node acquires a lock for that trigger. Other nodes attempting to execute the same trigger will fail to acquire the lock and skip execution, ensuring that the bulk invitation emails are dispatched **exactly once** by a single active container instance.
* **Health Check-Ins**: The `clusterCheckinInterval` property (set to 20,000ms) directs nodes to check in with the database. If one API node crashes or goes offline, the remaining healthy nodes automatically detect the failure and recover/re-fire any missed triggers.
* **Reschedule Policy**: If a schedule request is submitted for an event that already has an active scheduled job, the existing job will be cancelled and overwritten with the new schedule.
* **Time Validation**: Schedule timestamps must be in the future; requests with past timestamps will be rejected with HTTP 400 Bad Request.

### 4. Quartz Job Details
* **Job Class**: `SendAllInvitesJob.class` (extends `QuartzJobBean`).
* **Job Data Map**: Will store the `eventId` (UUID) and `userId` (UUID) of the organizer who scheduled the action.
* **Job Key**: JobName is `eventId.toString()`, and JobGroup is `"invite-jobs"`. Using the `eventId` guarantees a single active schedule per workspace and allows direct lookup for cancellation.

### 5. API Key Verification Design
* **Shared Secret Configuration**: Define a shared secret key configured via the environment variable `SECURITY_API_KEY` on both the backend Spring Boot container and the Next.js server node.
* **Spring Security ApiKeyFilter**: Implement a custom filter (`ApiKeyFilter`) running early in the Spring security chain (e.g. before the `JwtAuthenticationFilter`).
* **Validation & Exceptions**:
  - The filter intercepts incoming requests, extracts the `X-API-Key` header, and compares it against the configured backend key.
  - If the header is missing or incorrect, it bypasses further authentication, intercepts the chain, and writes a standard error JSON envelope `ApiResponse.failed("Invalid or missing API key")` directly to the response body with HTTP 401 status.
  - **Exemptions**: Public documentation paths (`/swagger-ui/**`, `/v3/api-docs/**`) and health checks (`/actuator/health`) are configured to bypass this check in local development.
  - **CORS preflight (OPTIONS)**: OPTIONS requests will also be subject to API Key verification as all client traffic is proxied by Next.js.

---

## 4. API Backend Upgrades (Spring Boot)

### 1. Chronological Spendings Endpoint
* **Path**: `GET /api/events/{eventId}/spendings`
* **Query Parameters**:
  - `page` (default: 0)
  - `size` (default: 10)
  - `search` (optional)
* **Response**: `Page<EventSpendingDto>` sorted by `spentAt` DESC, `createdAt` DESC.
* **Query Implementation**: Since `EventSpending` does not have an `eventId` property directly, the repository query must perform a `JOIN` on `EventComponent` matching `componentId = EventComponent.id` and filter by `EventComponent.eventId`.
* **Search Filter**: The `search` parameter filters by both the spending description and component name (case-insensitive).
* **Caching**: Results will be cached in Redis under the cache name `"event_chronological_spendings"` (with key incorporating pagination and search parameters), and evicted on create/update/delete spending operations.
* **DTO Updates**: Extend `EventSpendingDto` to include the `componentName` string property.

### 2. Send All Invitations & Scheduling Endpoints
* **Path**: `POST /api/events/{eventId}/invitees/send-all`
  - **Body**: `{ "scheduledTime": Instant }` (if `scheduledTime` is null or omitted, triggers immediate delivery; otherwise schedules via Quartz).
  - **Authorization**: Required signed role token in the `X-Event-Role-Token` header with rank `ORGANIZER` or higher (`OWNER` or `ORGANIZER`).
* **Path**: `DELETE /api/events/{eventId}/invitees/send-all/schedule`
  - **Description**: Cancels the active Quartz trigger for this event workspace.
  - **Authorization**: Required signed role token in the `X-Event-Role-Token` header with rank `ORGANIZER` or higher (`OWNER` or `ORGANIZER`).
* **Path**: `GET /api/events/{eventId}/invitees/send-all/schedule`
  - **Description**: Returns `{ "scheduledTime": Instant }` representing the scheduled delivery date/time (or null if none exists).
  - **Authorization**: Required signed role token in the `X-Event-Role-Token` header with rank `ORGANIZER` or higher (`OWNER` or `ORGANIZER`).

### 3. Service Layer & Security Filter Implementations
* **InviteeService**:
  - Implement bulk delivery logic targeting all guests with status `PENDING` who have configured emails.
  - Implement scheduling methods invoking Quartz's `Scheduler.scheduleJob(...)`, `Scheduler.unscheduleJob(...)`, and trigger checks.
* **ApiKeyFilter**:
  - Create a new class `ApiKeyFilter` extending `OncePerRequestFilter`.
  - Extract the `X-API-Key` header and compare it with the `@Value("${security.api-key}")` property.
  - Reject invalid queries immediately by writing JSON envelope directly.
  - Register the filter inside `SecurityConfig.java` to run before `JwtAuthenticationFilter`.

---

## 5. Frontend Upgrades (Next.js)

### 1. Chronological Spendings view (Budget Canvas)
* **Visual Switcher**: Add a button-group style switcher (`Component View` vs `All Spendings`) inside the [EventBudgetCanvas.tsx](/planohi-app-v4/web/components/features/EventBudgetCanvas.tsx) header.
* **Chronological Table**: In "All Spendings" mode, hide component categories and render a single paginated table of spendings containing columns: `Spent At`, `Description`, `Amount`, `Associated Component` (displaying component badge), and `Actions`.
* **URL Parameter Integration**: Store the view mode and page index in the URL (e.g. `?tab=budget&view=all&page=1`) so that search and refresh behaviors preserve current canvas configuration.

### 2. Bulk Scheduling UI (Guest Canvas)
* **Send All Button**: Add a primary "Send All Invites" button in [EventGuestCanvas.tsx](/planohi-app-v4/web/components/features/EventGuestCanvas.tsx).
* **Scheduling Modal**: Clicking the button opens a modal allowing the organizer to select:
  1. `Send Now`: Triggers immediate delivery.
  2. `Schedule Date`: Input box utilizing the custom `DatePicker` and time selectors to define a future delivery date.
* **Schedule Banner**: If an invitation schedule is active, show an alert banner (e.g., `Invitations scheduled for delivery on June 15, 2026, at 10:00 AM`) accompanied by a "Cancel Schedule" action button.

### 3. Frontend API Key Injection
* **Next.js Proxy Router (`route.ts`)**: Update [route.ts](/planohi-app-v4/web/app/api/proxy/%5B...path%5D/route.ts) to extract `process.env.SECURITY_API_KEY` and inject the `X-API-Key` header to all forwarded backend HTTP fetch requests. This keeps the key hidden from the client browser.
* **Direct Server-Side calls (`api-client.ts`)**: Update [api-client.ts](/planohi-app-v4/web/lib/api-client.ts) to append `X-API-Key` when calling from server environments (`isServer` is true) using `process.env.SECURITY_API_KEY`.

---

## 6. Verification Plan

### Automated Testing
* **Job Scheduler Tests**: Create a JUnit integration test validating that scheduling a job writes it to PostgreSQL `qrtz_` tables and triggering executes bulk RabbitMQ message publishing.
* **Cancellation Tests**: Assert that calling `DELETE` unschedules the Quartz job, removing the trigger from the database.
* **API Key Filter Security Tests**: Write integration tests simulating requests to endpoints with missing, incorrect, and valid API Key headers, asserting they return HTTP 401, HTTP 401, and HTTP 200/Success respectively.

### Manual Verification
* Schedule invitations for 2 minutes in the future, watch the active banner, verify that Maildev captures the emails at the trigger time, and verify that the schedule banner vanishes on success.
* Toggle the Budget Canvas to chronological view and verify that page changes and search queries update list items correctly.
* Use cURL to invoke a REST endpoint (e.g. `GET /api/events`) directly without a header and verify it returns a clean JSON error block with HTTP 401.
