# Sprint 3: Component Tracking & Timeline Canvas

This sprint introduces actual cost tracking against estimates and an interactive checklist timeline for organizers to measure task completion.

---

## 1. Goal
Allow organizers to log individual expenditures (Spendings) and tag them to specific event components. Additionally, provide an interactive, chronological timeline checklist of event milestones with dynamic completion metrics.

---

## 2. User Stories
* **US-3.1 (Log Spending)**: As an event organizer, I want to record individual payments or expenditures (Spendings) against a specific component (e.g. down payment for catering) so that I can keep track of where the money goes.
* **US-3.2 (Budget vs Actual Analytics)**: As an event organizer, I want to compare the estimated budget against actual spent values side-by-side with visual status highlights (e.g. green for under budget, red for over budget) so that I can manage budget leaks immediately.
* **US-3.3 (Timeline Task Addition)**: As an event organizer, I want to add specific preparation tasks to a chronological timeline checklist so that I can schedule steps in advance.
* **US-3.4 (Milestone Progress Toggle)**: As an event organizer, I want to toggle the completion status of timeline milestones and see a real-time progress update (e.g. "60% completed") so that I can visualize our readiness.

---

## 3. Database Schema (PostgreSQL)

### Table: `event_spending`
* Tracks actual expenses mapped to an `event_component`.
* Links each cash outflow to a timestamp and description.
* Inherits from `BaseAuditEntity` (with `TIMESTAMPTZ` auditing columns).

```sql
CREATE TABLE event_spending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    spent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_spending_component FOREIGN KEY (component_id) REFERENCES event_component(id) ON DELETE CASCADE
);
CREATE INDEX idx_spending_component ON event_spending(component_id);
```

### Table: `timeline_item`
* Tracks milestones or checklist items related to the event planning process.
* Stores due dates and completion states.
* Inherits from `BaseAuditEntity` (with `TIMESTAMPTZ` auditing columns).

```sql
CREATE TABLE timeline_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_timeline_event FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE
);
CREATE INDEX idx_timeline_event ON timeline_item(event_id);
CREATE INDEX idx_timeline_due ON timeline_item(due_at);
```

---

## 4. Backend REST APIs & Security Validation

All endpoints below require a valid `AUTH_TOKEN` session. The backend must enforce that the authenticated user owns the parent `Event` workspace associated with the target component or timeline item. If ownership check fails, the backend must return a `400 Bad Request` or `403 Forbidden` error without leaking information.

### 1. Add Event Spending
* **Endpoint**: `POST /api/components/{componentId}/spendings`
* **Request Payload**:
  ```json
  {
    "description": "Down payment for catering",
    "amount": 5000.00,
    "spentAt": "2026-05-23T23:15:00Z"
  }
  ```
* **Validation**:
  - `amount` must be strictly positive (`@DecimalMin(value = "0.01")`).
  - `description` must not be blank and max 255 chars.
* **Response**: `201 Created`
* **Cache Eviction**: Evict `"event_budget_summary"` and `"events_detail"` caches for the associated event, and evict the `"events_list"` cache (all entries).

### 2. Get Budget and Spending Summary
* **Endpoint**: `GET /api/events/{eventId}/budget-summary`
* **Response**: `200 OK` (Cacheable under namespace `"event_budget_summary"` with key `userId:eventId`)
  ```json
  {
    "totalEstimatedCost": 40000.00,
    "totalActualSpent": 5000.00,
    "components": [
      {
        "id": "c11d372e-0000-4995-b91c-2ff32822a111",
        "name": "Venue Reservation",
        "estimatedCost": 25000.00,
        "actualSpent": 0.00
      },
      {
        "id": "c22d372e-1111-4995-b91c-2ff32822a222",
        "name": "Catering Services",
        "estimatedCost": 15000.00,
        "actualSpent": 5000.00
      }
    ]
  }
  ```

### 3. Add Timeline Item
* **Endpoint**: `POST /api/events/{eventId}/timeline`
* **Request Payload**:
  ```json
  {
    "title": "Send out RSVP invitations",
    "dueAt": "2026-10-01T12:00:00Z"
  }
  ```
* **Validation**:
  - `dueAt` must be within the event's boundaries (`startDate` and `endDate` inclusive).
  - `title` must not be blank and max 255 chars.
* **Response**: `201 Created`
* **Cache Eviction**: Evict `"event_timeline"` cache for this event.

### 4. Toggle Timeline Item Status
* **Endpoint**: `PATCH /api/timeline/{itemId}/toggle`
* **Request Payload**:
  ```json
  {
    "isDone": true
  }
  ```
* **Response**: `200 OK`
* **Cache Eviction**: Evict `"event_timeline"` cache for the associated event.

### 5. Get Event Timeline
* **Endpoint**: `GET /api/events/{eventId}/timeline`
* **Response**: `200 OK` (Cacheable under namespace `"event_timeline"` with key `userId:eventId`)
  ```json
  {
    "completedCount": 1,
    "totalCount": 2,
    "items": [
      {
        "id": "t11d372e-0000-4995-b91c-2ff32822a999",
        "title": "Pay Venue Deposit",
        "dueAt": "2026-06-01T08:00:00Z",
        "isDone": true
      },
      {
        "id": "t22d372e-1111-4995-b91c-2ff32822a888",
        "title": "Send out RSVP invitations",
        "dueAt": "2026-10-01T12:00:00Z",
        "isDone": false
      }
    ]
  }
  ```

---

## 5. Frontend & Layout Work

* **Interactive Budget Canvas**:
  - Visual breakdown comparing `Estimated Cost` vs `Actual Spent` per component.
  - Displays color indicators: green (under/at budget), red (exceeded budget).
  - Expandable components showing nested transaction logs (Spendings) and a "Log Expense" button.
  - Form validation matching: errors (e.g. negative spending) must highlight specific form inputs.
* **Timeline Planner Section**:
  - Visual timeline node indicator showing current tasks status.
  - Interactive checkboxes to toggle item status on the fly.
  - Dynamic completion rate card (e.g. "50% Complete" using pure CSS `conic-gradient` or SVG, keeping performance lightweight without external charting libraries).
  - Quick action form to add a new task with title and custom `DatePicker` component (with date selections restricted within the parent event's date boundaries).

