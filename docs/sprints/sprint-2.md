# Sprint 2: Event Profiles & Budgeting Canvas

This sprint implements the creation of events, Agoda-style date-range selections, local banner image uploading with session and token-based protection, and structural event budgeting components.

---

## 1. Goal
Enable logged-in organizers to create and view event profiles, upload banner images locally to the backend server (persisted via Docker volumes and protected via session cookie or guest token checks), and define event components (e.g., Venue, Transportation) with estimated costs. The total estimated cost of the event is dynamically calculated on query time as the sum of all components.

---

## 2. User Stories
* **US-2.1 (Create Event)**: As an event organizer, I want to create a new event with a title, description, and dates (single day or range) so that I can set up a central planning workspace.
* **US-2.2 (Local Banner Upload & Protection)**: As an event organizer, I want to upload a banner image for my event that is stored locally on the server (persisted via Docker volumes).
  - Access to the banner is protected: planners access it via their active auth session, while public invitees (RSVP guests) access it via a token-authorized route (`/api/public/rsvp/banner?token={token}`). Unauthenticated non-users are blocked.
* **US-2.3 (Events Dashboard List)**: As an event organizer, I want to see a list of my planned events on a dashboard—including paging, text-based search, and estimated budget previews—so that I can quickly monitor and jump to any specific event workspace.
* **US-2.4 (Event Components Breakdown)**: As an event organizer, I want to define budgeting categories (Event Components like Venue, Catering) with estimated costs so that I can structure my event's expenses.
* **US-2.5 (Aggregated Estimated Cost)**: As an event organizer, I want the system to sum the estimated costs of all event components dynamically via database aggregation so that I have a clear view of the total budget projection.
* **US-2.6 (Landing Page & Redirection)**: As a user visiting the app root `/`, I want to see a styled cyber-glow landing page describing PlanoHi, and automatically be redirected to `/events` if I have a valid authenticated session.

---

## 3. Database Schema (PostgreSQL)

### Base Audit Entity Refactor
* Refactor the backend `BaseAuditEntity` class to use Java `Instant` / `OffsetDateTime` fields.
* All auditing columns (`created_at`, `updated_at`) across all tables must use `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`) to maintain global consistency.

### Table: `event`
* Stores main event metadata associated with a user.
* Supports either single-day events or multi-day date ranges.
  - **Single-day storage rule**: Store `start_date` as `YYYY-MM-DDT00:00:00Z` and `end_date` as `YYYY-MM-DDT23:59:59Z` in UTC to allow queries to naturally span the full day.
* Uses `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`) to enforce timezone precision across clients.

```sql
CREATE TABLE event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    banner_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_event_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE
);
CREATE INDEX idx_event_user ON event(user_id);
```

### Table: `event_component`
* Defines modular building blocks of the event (e.g. Venue, Catering, Transportation).
* Establishes individual estimated costs.
* Inherits from `BaseAuditEntity` (with `TIMESTAMPTZ` auditing columns).

```sql
CREATE TABLE event_component (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_component_event FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE
);
CREATE INDEX idx_component_event ON event_component(event_id);
```

---

## 4. Backend REST APIs

### 1. Create Event
* **Endpoint**: `POST /api/events`
* **Content-Type**: `multipart/form-data`
* **Request Params (Form Data)**:
  - `title`: " Wedding Party"
  - `description`: "Celebrating marriage in Cebu!"
  - `startDate`: "2026-12-18T00:00:00Z"
  - `endDate`: "2026-12-20T00:00:00Z"
  - `banner`: `[File Binary]` (Optional)
* **Behavior**:
  - Extracts the authenticated `user_id` from the secure `AUTH_TOKEN` JWT.
  - If a banner file is uploaded:
    - Validates that it is an image (PNG, JPG) and checks file size limits (<= 5MB).
    - If format/size validation fails, returns a `400 Bad Request` mapping the validation message to the `banner` field inside the standard `ApiResponse` envelope.
    - Saves the file locally under `/app/uploads/banners/` (mounted as a Docker volume `./uploads:/app/uploads` on the host).
    - Stores the relative web path (e.g., `/uploads/banners/{filename}`) into `banner_url`.
  - Inserts record into `event`.
* **Response**: `201 Created` with created event JSON.

### 2. List Events (Paginated & Searchable)
* **Endpoint**: `GET /api/events`
* **Query Parameters**:
  - `page`: Page index (default: `0`)
  - `size`: Page size (default: `10`)
  - `search`: Filter search query (optional)
* **Behavior**:
  - Retrieves paginated events belonging to the authenticated organizer.
  - Filters by the `search` query parameter using a case-insensitive partial match (`LOWER`/`ILIKE` logic) across **both** the event `title` and `description` fields.
  - Computes the aggregate estimated budget sum (`totalEstimatedCost`) dynamically via a JPQL/SQL `SUM` query for each event in the page content.
* **Response**: `200 OK`
  ```json
  {
    "content": [
      {
        "id": "e44d372e-36fa-4995-b91c-2ff32822a129",
        "title": " Wedding Party",
        "description": "Celebrating marriage in Cebu!",
        "startDate": "2026-12-18T00:00:00Z",
        "endDate": "2026-12-20T00:00:00Z",
        "bannerUrl": "/uploads/banners/wedding_party.png",
        "totalEstimatedCost": 40000.00,
        "createdAt": "2026-05-23T23:10:00Z"
      }
    ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 1,
    "totalPages": 1
  }
  ```

### 3. Get Event Details
* **Endpoint**: `GET /api/events/{eventId}`
* **Response**: `200 OK` with detailed metadata.

### 4. Create Event Component
* **Endpoint**: `POST /api/events/{eventId}/components`
* **Request Payload**:
  ```json
  {
    "name": "Venue Reservation",
    "estimatedCost": 25000.00
  }
  ```
* **Response**: `201 Created`

### 5. Get Event Components
* **Endpoint**: `GET /api/events/{eventId}/components`
* **Response**: `200 OK`
  ```json
  {
    "components": [
      {
        "id": "c11d372e-0000-4995-b91c-2ff32822a111",
        "name": "Venue Reservation",
        "estimatedCost": 25000.00
      },
      {
        "id": "c22d372e-1111-4995-b91c-2ff32822a222",
        "name": "Catering Services",
        "estimatedCost": 15000.00
      }
    ],
    "totalEstimatedCost": 40000.00
  }
  ```

### 6. Public Guest Banner Fetch
* **Endpoint**: `GET /api/public/rsvp/banner`
* **Query Parameters**:
  - `token`: Cryptographic RSVP lookup token
* **Behavior**:
  - Validates that the provided guest RSVP `token` exists in the database.
  - If valid, serves the associated event's banner file from disk.
  - If invalid, returns a `403 Forbidden` error.

---

## 5. Frontend & Layout Work

* **Landing Page (`/`)**:
  - Renders a cyber-glow entry welcome screen.
  - Implements middleware navigation: if a user is logged in (has `AUTH_TOKEN`), they are auto-redirected to `/events`. If not, they see custom buttons mapping to `/login` and `/register`.
* **Dashboard View (`/events`)**:
  - Lists current events with cards showing title, date preview, banner thumbnail, current estimated budget total, and an "Add New Event" trigger button.
  - Integrates query parameters (search query, pages) into the URL search parameters to make the UI history-supportive and shareable.
* **Create Event Dialog / Page**:
  - Integrates custom `DateRangePicker` for range selection, input file upload with preview for banners, title, and description inputs.
* **Event Detail Canvas (`/events/[id]`)**:
  - **Banner Header**: Showcases the uploaded event banner with details overlaid.
  - **Budget Overview Card**: Displays the overall estimated budget (e.g. `₱40,000.00`).
  - **Components List**: List layout showing each component and its estimated cost. Includes a quick action button to add/remove components via Modals.
