# QA Test Cases: Sprint 5 - Event Lifecycle Operations & Time-Sensitive Date Configs

## 1. Feature Coverage Summary
Event deletion cascades, local banner disk eviction, guest constraints (confirmed headcount boundaries), hour/minute precise DatePickers, and local formatting.

### Mapped User Stories
- **US-5.1**: Event Workspace Lifecycle
- **US-5.2**: Component & Spending Management
- **US-5.3**: Guest List Management Lifecycle
- **US-5.4**: Time-Sensitive Scheduling Inputs
- **US-5.5**: Explicit Date-Time Formatting

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-5.1** | DB / Cascade | Delete Event workspace cascade deletions | 1. Delete an event from header actions\n2. Inspect components, spendings, and guests database records | All related child records are cascade deleted from PostgreSQL tables | PASS | Functional validation passes |
| **TC-5.2** | Business Logic | Delete Event local banner eviction | 1. Upload banner to event\n2. Delete event workspace\n3. Verify server file storage | Local banner image file is evicted from server storage directory/volume to free disk space | PASS | Functional validation passes |
| **TC-5.3** | Business Logic | Edit guest headcount limit constraints | 1. Guest has RSVP'd with headcount 3\n2. Planner attempts to edit guest headcount limit to 2\n3. Save | API/Form blocks change, preventing guest limits from being set lower than confirmed party sizes | PASS | Functional validation passes |
| **TC-5.4** | UI / Zod Validation | Time-Sensitive Pickers hours/minutes validation | 1. Open Create/Edit modals\n2. Check Date input selectors\n3. Choose precise time and save | Pickers support selecting hours/minutes; form compiles payload as valid UTC ISO string | PASS | Functional validation passes |
| **TC-5.5** | Business Logic | Explicit Date-Time formatting | 1. Save event time as 14:30 UTC\n2. View page in browser at local timezone GMT+8\n3. Verify display format | Renders as local time (e.g. May 28, 2026, 22:30), preventing time zone confusion | PASS | Functional validation passes |
| **TC-5.6** | UI / Visual | Edit Modals Save Buttons Spinner Audit | 1. Open Edit Event details\n2. Edit fields and click Save Changes\n3. Check spinner | FAIL: Modals save buttons disable but omit the standardized isLoading prop spinner. | FAIL | Omitted standardized isLoading prop |
| **TC-5.7** | UI / Visual | Delete Event Button Spinner Audit | 1. Click Delete Event\n2. Click Delete inside confirmation overlay\n3. Check spinner | FAIL: Delete button disables but lacks the standardized isLoading prop spinner. | FAIL | Omitted standardized isLoading prop |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `EditEventModal.tsx`
  - **Button Label**: "Save Changes"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `EditComponentModal.tsx`
  - **Button Label**: "Save Changes"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `EditInviteeModal.tsx`
  - **Button Label**: "Save Changes"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `EventWorkspaceHeaderActions.tsx`
  - **Button Label**: "Delete Event"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={deleteLoading} but lacks the standardized isLoading prop.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `EditEventModal.tsx` ("Save Changes") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `EditComponentModal.tsx` ("Save Changes") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `EditInviteeModal.tsx` ("Save Changes") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `EventWorkspaceHeaderActions.tsx` ("Delete Event") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
