# Sprint 5: Event Lifecycle Operations & Time-Sensitive Date Configs

This sprint implements edit and delete operations across all core entities (Events, Components, Spendings, Invitees) and upgrades scheduling controls to support hour-and-minute precision (time-sensitive Date and DateRange Pickers) with explicit time printing across the entire platform.

---

## 1. Goal
Provide event organizers with full control over event workspaces (Editing and Deleting Events, Components, Spendings, and Invitees), and upgrade scheduling inputs to support hour-and-minute precision (time-sensitive Date and DateRange Pickers) with explicit time printing across the interface.

---

## 2. User Stories

* **US-5.1 (Event Workspace Lifecycle)**: As an event organizer, I want to edit event details (title, description, times, banner) or delete the event workspace entirely. The delete action must be accessible only when a specific event is selected, prompting for confirmation using a custom [Modal.tsx](planohi-app-v4/web/components/ui/Modal.tsx) overlay, and ensuring that deleted event banners are removed from storage and all nested entities cascade delete.
* **US-5.2 (Component & Spending Management)**: As an event organizer, I want to edit budget component estimates and edit or delete logged spending transactions to keep the financial canvas aggregates accurate.
* **US-5.3 (Guest List Management Lifecycle)**: As an event organizer, I want to edit guest names and allowed headcount limits, or delete guest records from the invite list, ensuring that guest limits cannot be set lower than their already-confirmed RSVP party size.
* **US-5.4 (Time-Sensitive Scheduling Inputs)**: As an event organizer, I want the system's date input forms to support hour-and-minute selections inside custom pickers so that I can schedule precise times for events, spendings, and task milestones.
* **US-5.5 (Explicit Date-Time Formatting)**: As an event organizer and invited guest, I want all displayed dates across the dashboard, calendar triggers, and public RSVP portals to print times alongside dates aligned to the browser's local time (e.g. `May 28, 2026, 14:30`) to avoid timing ambiguity.

---

## 3. Database Schema & Cascading Rules

No new tables are required for this sprint. Deleting an event workspace relies on database-level constraint cascading:
* The foreign keys in `event_component`, `event_spending`, and `invitee` are defined with `ON DELETE CASCADE`.
* Deleting a record from `event` will automatically cascade-delete all child component, spending, and guest records.
* The single-day normalization in the service layer will be refactored to align boundaries (00:00:00 to 23:59:59) only when the start and end dates are mathematically identical down to the millisecond, preserving hour/minute adjustments when they differ.

---

## 4. Backend REST APIs

### 1. Update Event Workspace
* **Endpoint**: `PUT /api/events/{eventId}` (multipart/form-data)
* **Behavior**:
  - Validates that the event exists and belongs to the authenticated user.
  - Updates title, description, and start/end dates.
  - **GAP 12 Boundary Validation**: Queries existing timeline milestones before saving. If the new `startDate` or `endDate` range excludes any existing milestone `dueAt` date, rejects the request with a `FieldValidationException`.
  - **GAP 13 File Deletion Safety**: If a new banner file is uploaded, deletes the old banner file from physical storage (`/app/uploads/banners`) wrapped in a try-catch block to prevent disk exceptions from aborting the DB transaction.
* **Response**: `200 OK` with updated `EventDto`

### 2. Delete Event Workspace
* **Endpoint**: `DELETE /api/events/{eventId}`
* **Behavior**:
  - Validates user ownership.
  - Retrieves the event to find the banner file path; deletes the banner file from physical storage. **GAP 13 File Deletion Safety**: Wrapped in a try-catch block to log disk IO errors without throwing, ensuring DB transaction commits successfully.
  - Deletes the `event` record from the database (triggers cascading deletes of components, spendings, and invitees).
* **Response**: `200 OK` (empty results)

### 3. Update Component Budget Estimate
* **Endpoint**: `PUT /api/events/{eventId}/components/{componentId}`
* **Request Payload**:
  ```json
  {
    "name": "Updated Catering Name",
    "estimatedCost": 25000.00
  }
  ```
* **Behavior**:
  - Validates event ownership and that the component belongs to the specified event.
  - Saves the updated name and estimated budget.
* **Response**: `200 OK` with updated `EventComponentDto`

### 4. Update Spending Transaction
* **Endpoint**: `PUT /api/components/{componentId}/spendings/{spendingId}`
* **Request Payload**:
  ```json
  {
    "description": "Final catering deposit payment",
    "amount": 12500.00,
    "spentAt": "2026-05-28T14:30:00Z"
  }
  ```
* **Behavior**:
  - Validates ownership of the parent event component.
  - Validates that amount is positive.
  - Updates description, amount, and timestamp fields.
* **Response**: `200 OK` with updated `EventSpendingDto`

### 5. Delete Spending Transaction
* **Endpoint**: `DELETE /api/components/{componentId}/spendings/{spendingId}`
* **Behavior**:
  - Validates parent component ownership.
  - Deletes the spending record from the database.
  - **GAP 14 Cache Eviction Return**: Returns the parent `eventId` (UUID) to enable the caching layer to evict budget summary caches.
* **Response**: `200 OK` with parent eventId (UUID) in the result field

### 6. Update Guest Invitation
* **Endpoint**: `PUT /api/events/{eventId}/invitees/{inviteeId}`
* **Request Payload**:
  ```json
  {
    "name": "Jane & Family (Updated)",
    "allowedGuests": 5
  }
  ```
* **Behavior**:
  - Validates event ownership and invitee presence.
  - **GAP 15 Headcount Constraints**: Enforces that the new `allowedGuests` limit is at least `1`. If the status is `ACCEPTED`, validates that the new limit is not less than the guest's already-confirmed `attendingGuests` headcount. Otherwise, throws a `FieldValidationException`.
  - Updates the name and headcount limits.
* **Response**: `200 OK` with updated `InviteeDto` (containing the secure invitation token to support token-based public cache evictions)

### 7. Delete Guest Invitation
* **Endpoint**: `DELETE /api/events/{eventId}/invitees/{inviteeId}`
* **Behavior**:
  - Validates event ownership.
  - Deletes the guest record, freeing up allocated capacity.
  - **GAP 14 Cache Eviction Return**: Returns the secure invitation `token` (String) of the deleted guest to allow the caching layer to evict the token-based public RSVP cache.
* **Response**: `200 OK` with the deleted guest's token (String) in the result field

---

## 5. Caching Eviction Mappings

To maintain read consistency across updates, the services will coordinate the following cache evictions:

| API Operation | Evicts Cache Namespace | Eviction Key / Mechanism |
| :--- | :--- | :--- |
| **PUT /api/events/{id}** | `events_detail`, `events_list`, `public_rsvp` | Key: `userId + ':' + eventId`, all list entries, all public tokens (using `allEntries = true` on `public_rsvp` to clear all token-cache references for the event). |
| **DELETE /api/events/{id}** | `events_detail`, `events_list`, `event_budget_summary`, `event_invitees`, `event_metrics`, `public_rsvp` | Key: `userId + ':' + eventId`, and triggers `allEntries = true` eviction for list, summary, metrics, and public caches. |
| **PUT /components/{id}** | `event_budget_summary`, `events_detail`, `events_list` | Evicts by event ID returned in DTO payload (`#result.eventId`). |
| **PUT/DELETE spendings/{id}** | `event_budget_summary`, `events_detail`, `events_list` | Evicts by event ID returned in the DTO or return value (`#result.eventId` or `#result`). |
| **PUT/DELETE invitees/{id}** | `event_invitees`, `event_metrics`, `public_rsvp` | Evicts list and metrics (`#eventId` parameter). For public RSVP, evicts by token retrieved from updated DTO (`#result.token`) or returned delete result (`#result` token). |

---

## 6. Frontend & Layout Work

### 1. Custom Date & Time Picker Components
* **DatePicker (`DatePicker.tsx`)**:
  - Add inline selectors for hours (`0-23`) and minutes (`00-59`) styled in dark theme inside the calendar dropdown drawer.
  - Day clicks update the date while keeping the dropdown open for time selections.
  - Add a "Done" action button at the bottom of the drawer to confirm selections and close the panel.
  - Trigger button shows: `MMM D, YYYY, HH:mm` (e.g. `May 28, 2026, 14:30`).
* **DateRangePicker (`DateRangePicker.tsx`)**:
  - Render separate Hour/Minute time dropdown selects for both "Start Time" and "End Time" inside the drawer.
  - Trigger button shows formatted dates and times side-by-side.

### 2. Form Integrations
* **CreateEventForm**: Format the date values as `toISOString()` to forward exact hour/minute selections to the multipart endpoint.
* **AddTimelineItemModal**: Remove the native `<input type="time">` and delegate time inputs to the upgraded time-sensitive `DatePicker`.
* **LogSpendingModal**: Delegate time selections to `DatePicker`.

### 3. Displaying Times & Hydration Safety
* **Browser Timezone formatting**: Refactor date presentation functions to print hours and minutes using the browser's local timezone (`MMM D, YYYY, HH:mm`) inside EventCard.tsx, event details page, EventBudgetCanvas.tsx (spendings timestamps), EventTimelineCanvas.tsx (milestone deadlines), EventGuestCanvas.tsx (response times), and RsvpClient.tsx (invitation details).
* **Next.js Hydration safety**: To prevent Next.js hydration warning mismatches between server UTC pre-rendering and local client timezones, all React client components formatting dates must only render dates after mounting (`mounted` state check) or apply `suppressHydrationWarning` on the respective HTML date wrapper elements.

### 4. Edit/Delete Modals & Controls
* **Workspace Page Header**: Add "Edit Workspace" and "Delete Workspace" triggers. The delete option must be shown only when the event workspace is selected (within the event details view, not on the dashboard cards) and must trigger a custom [Modal.tsx](/planohi-app-v4/web/components/ui/Modal.tsx) confirmation overlay.
* **Budget Canvas**:
  - Row controls to edit component names/estimates.
  - Sub-row controls to edit/delete logged actual spendings.
* **Guest Canvas**:
  - Table row buttons to edit guest aliases and headcount caps or delete guest records.
* **New Modal Files**:
  - Create `EditEventModal.tsx`, `EditComponentModal.tsx`, `EditSpendingModal.tsx`, and `EditInviteeModal.tsx`.

---

## 7. Sprint Critique & Gaps Resolution

To maintain platform stability, performance, and UI visual consistency, the implementation of this sprint will resolve the following gaps:

* **GAP 11 (Next.js Hydration Mismatch)**: To prevent hydration mismatch warnings when displaying local time (server UTC vs browser local), all React client components formatting dates will render dates only after mounting (`mounted` state check) or apply `suppressHydrationWarning` on the respective text tags.
* **GAP 12 (Event Date Modifications vs Timeline Milestones)**: The service layer (`EventServiceImpl.updateEvent`) will query existing milestones before committing changes. If the new `startDate` or `endDate` range excludes any existing milestone `dueAt` date, it will throw a `FieldValidationException` to protect data boundaries.
* **GAP 13 (Robust Physical File Deletion)**: Disk banner file deletions will be wrapped in try-catch blocks to log warnings instead of throwing. Missing disk files will not fail the database delete transactions.
* **GAP 14 (Cache Eviction SpEL on DELETE)**: All delete operations in component, spending, and invitee services will return the parent `eventId` (UUID) instead of `void`, allowing SpEL cache evict expressions using `#result` to successfully target parent keys.
* **GAP 15 (allowedGuests vs attendingGuests constraints)**: Edit invitee validations will enforce `newAllowedGuests >= invitee.getAttendingGuests()` for ACCEPTED status, and `newAllowedGuests >= 1` globally to prevent negative or zero-party invitations.
