# Sprint 4: RSVP Management & Guest Canvas

This sprint implements the guest RSVP tracking system, secure passwordless invitation lookups, guest-limit checks, and the planner dashboard metrics.

---

## 1. Goal
Provide organizers with the ability to invite guests, allocate custom headcount limits per party, and copy personalized secure URLs. Guests can RSVP (accepting or declining and indicating their party size) without logging in, updating the event's master headcount and metrics in real time.

---

## 2. User Stories
* **US-4.1 (Guest Invitation Setup)**: As an event organizer, I want to add guest names and specify their allowed guest headcount limits so that I can manage event capacity rules.
* **US-4.2 (Secure Invitation Links)**: As an event organizer, I want the system to generate a unique secure link for each guest list entry so that I can easily copy and send the link individually.
* **US-4.3 (Login-Free Public RSVP)**: As an invited guest, I want to open my unique link to view custom event details and confirm my RSVP selection (Attending vs Declined) without needing an account.
* **US-4.4 (Party Size Selection)**: As an invited guest, I want to select my party size (up to the maximum allowed limit set by the organizer) when accepting the invitation so that the organizer knows the exact guest count.
* **US-4.5 (Real-time Attendee Analytics)**: As an event organizer, I want to see real-time statistics (total guests expected, accepted vs declined counts, pending list) on my dashboard so that I can orchestrate catering and venue preparation.

---

## 3. Database Schema (PostgreSQL)

### Table: `invitee`
* Tracks individual invitation records.
* Uses a high-entropy, unique cryptographic `token` to bypass login barriers for public RSVPs.
* Enforces party-size constraints.
* Inherits from `BaseAuditEntity` using `TIMESTAMP WITH TIME ZONE` columns for auditing.

```sql
CREATE TABLE invitee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL, -- Cryptographically secure token (UUID v4)
    allowed_guests INTEGER NOT NULL DEFAULT 1, -- Maximum allowed headcount for the invitee's party
    attending_guests INTEGER NOT NULL DEFAULT 0, -- Confirmed attending headcount
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, DECLINED
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_invitee_event FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE,
    CONSTRAINT chk_guest_counts CHECK (attending_guests <= allowed_guests AND attending_guests >= 0),
    CONSTRAINT chk_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED'))
);
CREATE INDEX idx_invitee_event ON invitee(event_id);
CREATE INDEX idx_invitee_token ON invitee(token);
```

---

## 4. Backend REST APIs

### 1. Add Invitees (Bulk or Single)
* **Endpoint**: `POST /api/events/{eventId}/invitees`
* **Request Payload**:
  ```json
  [
    {
      "name": "Jane & Family",
      "allowedGuests": 4
    },
    {
      "name": "Mark R.",
      "allowedGuests": 1
    }
  ]
  ```
* **Behavior**:
  - Validates that the event exists and belongs to the authenticated user.
  - Generates a random, secure token (`UUID.randomUUID().toString()`) for each record.
  - Saves all records into `invitee` in a bulk operation (`saveAll()`) with default status `PENDING`.
* **Response**: `201 Created`

### 2. List Invitees (Paginated & Searchable)
* **Endpoint**: `GET /api/events/{eventId}/invitees?page={page}&size={size}&search={search}`
* **Parameters**:
  - `page`: Page index (default: 0)
  - `size`: Page size (default: 10)
  - `search`: Case-insensitive partial matches on guest names (optional)
* **Response**: `200 OK`
  ```json
  {
    "content": [
      {
        "id": "i11d372e-0000-4995-b91c-2ff32822a777",
        "name": "Jane & Family",
        "token": "49afb321-12f8-4b77-ad54-8c8f000b0373",
        "allowedGuests": 4,
        "attendingGuests": 0,
        "status": "PENDING",
        "respondedAt": null
      }
    ],
    "totalPages": 1,
    "totalElements": 1
  }
  ```

### 3. Public Invite Lookup (No Auth Required)
* **Endpoint**: `GET /api/public/rsvp/{token}`
* **Behavior**:
  - Queries `invitee` by the cryptographic path parameter `token`.
  - Returns the associated event details and the invitee's status and allowed limits.
* **Response**: `200 OK`
  ```json
  {
    "inviteeName": "Jane & Family",
    "allowedGuests": 4,
    "attendingGuests": 0,
    "status": "PENDING",
    "event": {
      "id": "ac120004-9e59-1b95-819e-59dcb8b70000",
      "title": "Wedding Party",
      "description": "Celebrating marriage in Cebu!",
      "startDate": "2026-12-18T00:00:00Z",
      "endDate": "2026-12-20T00:00:00Z",
      "bannerUrl": "/uploads/banners/wedding_party.png"
    }
  }
  ```

### 4. Submit RSVP Response (No Auth Required / Supports Re-Submission)
* **Endpoint**: `POST /api/public/rsvp/{token}`
* **Request Payload**:
  ```json
  {
    "status": "ACCEPTED",
    "attendingGuests": 3
  }
  ```
* **Behavior**:
  - Verifies that the current system time is not past the event's `endDate`. If the event has ended, rejects the submission by throwing an `IllegalArgumentException` ("The RSVP window for this event is closed").
  - Validates that `attendingGuests` satisfies `1 <= attendingGuests <= allowedGuests` when status is `ACCEPTED`. Otherwise, throws a structured `FieldValidationException("attendingGuests", ...)`.
  - Forces `attendingGuests = 0` when status is `DECLINED`.
  - Performs an upsert update on the existing `invitee` record, writing/updating `status`, `attending_guests`, and populating `responded_at` with the current timestamp.
* **Response**: `200 OK`

### 5. Get Event Metrics (Single-Query Aggregation)
* **Endpoint**: `GET /api/events/{eventId}/metrics`
* **Behavior**:
  - Compiles RSVP statistics for the event dashboard.
  - Resolves counts and headcounts in a single database roundtrip using conditional aggregates (`SUM` and `COUNT(CASE WHEN...)`) to maximize execution speed.
* **Response**: `200 OK`
  ```json
  {
    "totalInvited": 5,
    "respondedCount": 3,
    "acceptedCount": 2,
    "declinedCount": 1,
    "pendingCount": 2,
    "totalAttendingHeadcount": 5
  }
  ```

---

## 5. Caching Strategy & Eviction Chains
To guarantee immediate consistency while maintaining high-performance reading:
1. **List Cache (`event_invitees`)**:
   - Caches lists returned by `GET /api/events/{eventId}/invitees`.
   - Key: `eventId + ':' + search + ':' + page + ':' + size`.
   - Evicted when the organizer adds/deletes a guest, or when a guest RSVPs.
2. **Metrics Cache (`event_metrics`)**:
   - Caches metrics returned by `GET /api/events/{eventId}/metrics`.
   - Key: `eventId`.
   - Evicted when the organizer adds/deletes a guest, or when a guest RSVPs.
3. **Public Lookup Cache (`public_rsvp`)**:
   - Caches public data returned by `GET /api/public/rsvp/{token}`.
   - Key: `token`.
   - Evicted when a guest submits/updates their RSVP response.

---

## 6. Frontend & Layout Work

* **Organizer Guest Dashboard (`/events/[id]/guests`)**:
  - **Summary Metrics Strip**: Highlights counts for Total Invited, Confirmed Guests, Declined, and Pending responses.
  - **Invitee Table**: Lists guest names, their RSVP status badges (using our custom `Badge` components), allowed limits, and confirmed counts.
  - **Empty State UX**: Displays a custom Cyberpunk-themed empty state screen when the guest list is empty (e.g., has 0 elements). This screen includes an illustrative graphic, a helpful description, and a button to trigger the quick-add guest modal.
  - **Share Action**: A "Copy Invite Link" action that dynamically constructs the full absolute URL using the client browser's origin:
    `const inviteUrl = window.location.origin + "/rsvp/" + token;`
  - **Quick Add**: Modal form to add a new guest with party limit.
* **Public Guest RSVP Page (`/rsvp/[token]`)**:
  - Minimalist, premium invitation card displaying the event's banner, description, and countdown.
  - **Event End Enforcement**: Detects if the event is in the past. If the event's end date has passed, renders the RSVP form in a disabled, view-only state showing: "The RSVP window for this event is closed."
  - Detects if the guest has already responded. If so, shows their current RSVP state ("You responded: Attending with 3 guests") and displays a "Change RSVP Response" button to let them re-submit if needed.
  - Attending selector: Displays only if "Will Attend" is chosen. Shows an interactive counter capped at `allowedGuests` (e.g. "Bringing 3 out of 4 guests").
  - Transition animations to a thank-you success confirmation page upon response submission.
