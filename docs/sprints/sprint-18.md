# Sprint 18: Milestone Cost Tracking via Budget Integration

This sprint streamlines the workflow for event owners, organizers, and collaborators by allowing them to record a monetary expense directly while creating a timeline milestone, seamlessly integrating the timeline and budget features.

---

## 1. Goals

- Seamlessly integrate the Budget and Timeline features so users don't have to fill out two separate forms.
- Update the frontend UI for Milestone creation to include an optional form section to record an associated `EventSpending`.
- Ensure no new database schema changes are made; reuse the existing `event_spending` and `event_component` tables.

---

## 2. User Stories

* **US-18.1 (Submit Spending with Milestone)**: As an event OWNER, ORGANIZER, or COLLABORATOR, I want to have the option to submit a spending entry (amount and budget component) within the "Add Milestone" form so that I don't have to navigate to the Budget Canvas separately.
* **US-18.2 (Unified Workflow Validation)**: As an event manager, I want the spending added from the timeline to accurately reflect in the budget canvas to maintain financial consistency.

---

## 3. Database Schema & Migration

* **N/A** — This sprint relies on reusing the existing `event_spending` table. No backend database tables or migrations are required.

---

## 4. Backend REST APIs

### 1. Create Timeline Item (Updated payload)
- **Endpoint Name & Path**: `POST /api/events/{eventId}/timeline`
- **Request Payload**: 
  ```json
  {
    "title": "Book Venue",
    "dueAt": "2026-12-01T10:00:00Z",
    "spending": {
      "componentId": "550e8400-e29b-41d4-a716-446655440000",
      "amount": 1500.00,
      "description": "Deposit for Venue"
    }
  }
  ```
- **Behavior**:
  - Validates user role has permission to manage the timeline.
  - Persists the timeline item.
  - If the optional `spending` object is provided, it leverages `EventSpendingRepository` (or the equivalent service) to automatically create an `EventSpending` record linked to the specified `componentId`.
  - Automatically sets the `spentAt` timestamp of the `EventSpending` to match the milestone's `dueAt`.
- **Response Status**: `201 Created`
- Response payload adhering to the `ApiResponse<T>` envelope.

---

## 5. Technical Implementation Details / Frontend Work

- **Backend**: Update `CreateTimelineItemRequest.java` to accept an optional nested DTO for the spending details.
- **Backend**: In `TimelineServiceImpl`, if the spending payload is present, map the data to an `EventSpending` entity and save it via `EventSpendingRepository`.
- **Frontend**: Update React components responsible for milestone creation. Embed an optional section that fetches available `EventComponent`s for the event, displays them in a dropdown, and provides an input for the spending amount.
- **Frontend**: Ensure the API request payload maps correctly to the updated backend structure.

> [!IMPORTANT]  
> By keeping the tables decoupled and handling the relationship purely through workflow integration, we avoid polluting the timeline domain with budget concerns.

---

## 6. Verification Plan

### Automated Testing
- `mvn clean test` to ensure no existing tests are broken.
- Add unit tests in `TimelineServiceImplTest` to verify that when a `spending` payload is present, an `EventSpending` is correctly mapped and saved to the database.
- `npm run build` in the frontend web directory to verify the Next.js build passes.

### Manual Verification
- Log in as an OWNER or ORGANIZER, navigate to an event's timeline.
- Click "Add Milestone", verify the new optional "Add Spending" section is present.
- Enter milestone details, select a budget component, enter an amount, and save.
- Verify the milestone appears on the timeline.
- Navigate to the Budget Canvas and verify the newly added spending record appears under the selected component with the correct amount and description.
