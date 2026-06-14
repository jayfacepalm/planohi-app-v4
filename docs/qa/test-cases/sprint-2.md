# QA Test Cases: Sprint 2 - Event Profiles & Budgeting Canvas

## 1. Feature Coverage Summary
Event creation, local banner image uploading, events dashboard view, components breakdown, and aggregated budget cost.

### Mapped User Stories
- **US-2.1**: Create Event
- **US-2.2**: Local Banner Upload & Protection
- **US-2.3**: Events Dashboard List
- **US-2.4**: Event Components Breakdown
- **US-2.5**: Aggregated Estimated Cost

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-2.1** | US-2.1 | Create a new event | 1. Click 'Create New Event'\n2. Fill title, description, and dates\n3. Click 'Create' | Sends POST /api/events, modal closes, event list updates dynamically | PASS | Functional verification passes |
| **TC-2.2** | US-2.2 | Verify event banner upload and security | 1. Upload a banner in CreateEventModal\n2. Verify local storage upload\n3. Access via unauthenticated session | Planners see banner via active session; public users are blocked unless providing valid RSVP token | PASS | Functional verification passes |
| **TC-2.3** | US-2.3 | Verify dashboard search and paging | 1. Enter search query\n2. Click search or paginate results | Updates URL search parameters, sends server-side query, updates results | PASS | Functional verification passes |
| **TC-2.4** | Button Loading | Verify Create Event button loading behavior | 1. Open Create Event modal\n2. Submit form\n3. Observe submit button | Submit button disables and shows neon spinner using isLoading prop | FAIL | Omitted standardized isLoading prop |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `CreateEventModal.tsx`
  - **Button Label**: "Create Event"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `EventsDashboardClient.tsx`
  - **Button Label**: "Create New Event / Search"
  - **Status**: **PASS**
  - **Observations**: Button triggers client-side local modal modal open; no async loading indicator needed on this button.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `CreateEventModal.tsx` ("Create Event") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
