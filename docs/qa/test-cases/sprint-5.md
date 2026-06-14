# QA Test Cases: Sprint 5 - Event Lifecycle Operations & Time-Sensitive Date Configs

## 1. Feature Coverage Summary
Updating or deleting event workspaces, cascaded entity deleting, precision pickers (hours/minutes), and locale formatting.

### Mapped User Stories
- **US-5.1**: Event Workspace Lifecycle
- **US-5.2**: Component & Spending Management
- **US-5.3**: Guest List Management Lifecycle
- **US-5.4**: Time-Sensitive Scheduling Inputs
- **US-5.5**: Explicit Date-Time Formatting

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-5.1** | US-5.1 | Verify event workspace deletion triggers modal | 1. Click Delete Event\n2. Observe confirmation overlay\n3. Confirm deletion | Opens modal warning dialog, cascades deletes child components, redirects planner to dashboard | PASS | Functional verification passes |
| **TC-5.2** | US-5.4 | Verify custom date-time picker supports hours & minutes | 1. Click date input field\n2. Verify calendar includes hour/minute selectors | Allows selecting specific calendar time, maps to ISO string payload | PASS | Functional verification passes |
| **TC-5.3** | Button Loading | Verify Edit Event Save loading behavior | 1. Edit event title\n2. Click Save Changes\n3. Check button status | Button disables and shows spinner using isLoading prop during save | FAIL | Omitted standardized isLoading prop |

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
