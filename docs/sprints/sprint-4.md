# Sprint 4: RSVP Management & Guest Canvas

This sprint implements the guest RSVP tracking system, secure passwordless invitation lookups, guest-limit checks, and the planner dashboard metrics.

---

## 1. Goal
Provide organizers with the ability to invite guests, allocate custom headcount limits per party, and copy personalized secure URLs. Guests can RSVP (accepting or declining and indicating their party size) without logging in, updating the event's master headcount in real time.

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
* Inherits from `BaseAuditEntity`.

```sql
CREATE TABLE invitee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL, -- Cryptographically secure token (UUID v4)
    allowed_guests INTEGER NOT NULL DEFAULT 1, -- Maximum allowed headcount for the invitee's party
    attending_guests INTEGER NOT NULL DEFAULT 0, -- Confirmed attending headcount
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, DECLINED
    responded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  - Generates a random, secure token (e.g. `UUID.randomUUID().toString()`) for each record.
  - Saves records into `invitee` with a default status of `PENDING`.
* **Response**: `201 Created`

### 2. List Invitees
* **Endpoint**: `GET /api/events/{eventId}/invitees`
* **Response**: `200 OK`
  ```json
  [
    {
      "id": "i11d372e-0000-4995-b91c-2ff32822a777",
      "name": "Jane & Family",
      "token": "49afb321-12f8-4b77-ad54-8c8f000b0373",
      "allowedGuests": 4,
      "attendingGuests": 0,
      "status": "PENDING",
      "respondedAt": null
    }
  ]
  ```

### 3. Public Invite Lookup (No Auth Required)
* **Endpoint**: `GET /api/public/rsvp/{token}`
* **Behavior**:
  - Queries `invitee` by the path parameter `token`.
  - Returns associated event metadata and invitee's limit.
* **Response**: `200 OK`
  ```json
  {
    "inviteeName": "Jane & Family",
    "allowedGuests": 4,
    "event": {
      "title": " Wedding Party",
      "description": "Celebrating marriage in Cebu!",
      "startDate": "2026-12-18T00:00:00Z",
      "endDate": "2026-12-20T00:00:00Z",
      "bannerUrl": "/uploads/banners/wedding_party.png"
    }
  }
  ```

### 4. Submit RSVP Response (No Auth Required)
* **Endpoint**: `POST /api/public/rsvp/{token}`
* **Request Payload**:
  ```json
  {
    "status": "ACCEPTED",
    "attendingGuests": 3
  }
  ```
* **Behavior**:
  - Verifies that `attendingGuests <= allowedGuests` (if `ACCEPTED`).
  - Sets `attendingGuests = 0` if `status` is `DECLINED`.
  - Updates the `invitee` record and populates `responded_at` with the current timestamp.
* **Response**: `200 OK`

### 5. Get Event Metrics
* **Endpoint**: `GET /api/events/{eventId}/metrics`
* **Behavior**:
  - Compiles RSVP statistics for the event dashboard.
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

## 5. Frontend & Layout Work

* **Organizer Guest Dashboard (`/events/[id]/guests`)**:
  - **Summary Metrics Strip**: Highlights counts for Total Invited, Confirmed Guests, Declined, and Pending responses.
  - **Invitee Table**: Lists guest names, their RSVP status badges (using our custom `Badge` components), allowed limits, and confirmed counts.
  - **Share Action**: A "Copy Invite Link" action that copies `/rsvp/[token]` to the clipboard.
  - **Quick Add**: Modal form to add a new guest with party limit.
* **Public Guest RSVP Page (`/rsvp/[token]`)**:
  - Minimalist, premium invitation card displaying the event's banner, description, and countdown.
  - Form allowing selection: **Will Attend** or **Will Not Attend**.
  - Attending selector: Displays only if "Will Attend" is chosen. Shows an interactive counter capped at `allowedGuests` (e.g. "Bringing 3 out of 4 guests").
  - Transition animations to a thank-you success confirmation page upon response submission.

