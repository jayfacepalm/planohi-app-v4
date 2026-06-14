# QA Test Cases: Sprint 9 - Chronological Spendings & Scheduled RSVP Invitations

## 1. Feature Coverage Summary
Chronological spendings log view, view switcher, Send All invites bulk delivery modal, scheduling RSVP invitations, and client authenticity API verification.

### Mapped User Stories
- **US-9.1**: Chronological Spendings Log
- **US-9.2**: Unified Spendings View switcher
- **US-9.3**: Immediate / Scheduled Bulk Invitations
- **US-9.4**: Schedule Management & Cancellation
- **US-9.5**: API Client Authenticity

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-9.1** | US-9.2 | Toggle between component and chronological spendings views | 1. Open Budget Canvas\n2. Locate Spendings View switcher\n3. Click switch toggle | Switches list from nested component layout to flat chronological log list | PASS | Functional verification passes |
| **TC-9.2** | US-9.3 | Schedule a bulk invitation delivery | 1. Open Guest Canvas\n2. Click 'Send All Invites'\n3. Choose 'Schedule Delivery' and set a date\n4. Save | Saves schedule timestamp, guest list scheduled tags update in UI | PASS | Functional verification passes |
| **TC-9.3** | US-9.4 | Cancel a scheduled invitation delivery | 1. Locate guest row with pending schedule\n2. Click 'Cancel Schedule' button | Revokes delivery timestamp, resets invite status to Draft | PASS | Functional verification passes |
| **TC-9.4** | Button Loading | Verify Send All button loading behavior | 1. Open Send All modal\n2. Click submit\n3. Check button status | Submit button disables and shows spinner using isLoading prop | FAIL | Omitted standardized isLoading prop |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `LogSpendingModal.tsx`
  - **Button Label**: "Log Spending"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `EditSpendingModal.tsx`
  - **Button Label**: "Save Changes"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `SendAllInvitesModal.tsx`
  - **Button Label**: "Send All"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `EventGuestCanvas.tsx`
  - **Button Label**: "Cancel Schedule"
  - **Status**: **FAIL**
  - **Observations**: Cancel schedule button uses disabled={cancelLoading} but lacks isLoading.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `LogSpendingModal.tsx` ("Log Spending") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `EditSpendingModal.tsx` ("Save Changes") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `SendAllInvitesModal.tsx` ("Send All") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `EventGuestCanvas.tsx` ("Cancel Schedule") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
