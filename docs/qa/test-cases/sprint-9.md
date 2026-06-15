# QA Test Cases: Sprint 9 - Chronological Spendings & Scheduled RSVP Invitations

## 1. Feature Coverage Summary
Flat chronological transaction spendings logs, views toggle switcher, Send All invites bulk delivery, scheduling RSVPs, and client key authenticity.

### Mapped User Stories
- **US-9.1**: Chronological Spendings Log
- **US-9.2**: Unified Spendings View switcher
- **US-9.3**: Immediate / Scheduled Bulk Invitations
- **US-9.4**: Schedule Management & Cancellation
- **US-9.5**: API Client Authenticity

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-9.1** | Business Logic | Flat Chronological Spendings transaction sorting | 1. Add spendings A (May 1), spending B (June 2), and spending C (June 10)\n2. Load chronological log | Transactions display in reverse chronological order (C, then B, then A) across all components | PASS | Functional validation passes |
| **TC-9.2** | UI / Business Logic | Spendings layout view switcher toggle | 1. Toggle view switch in Budget tab\n2. Verify layout shifts | Smooth transition between nested components spending list and chronological flat log | PASS | Functional validation passes |
| **TC-9.3** | Business Logic | Send All Invites bulk immediate delivery | 1. Click Send All Invites\n2. Select immediate delivery\n3. Submit | Draft invitations queues in RabbitMQ; guests email status updates to Sent | PASS | Functional validation passes |
| **TC-9.4** | Business Logic | Send All Invites bulk scheduled delivery | 1. Click Send All Invites\n2. Select schedule delivery\n3. Input future timestamp and submit | Saves schedule; guest lists display scheduled delivery date tag | PASS | Functional validation passes |
| **TC-9.5** | Business Logic | Scheduled delivery cancellation boundary | 1. Locate scheduled invite row\n2. Click 'Cancel Schedule' before dispatch timestamp\n3. Observe status | Cancels schedule timestamp, resets invite status to Draft, prevents dispatch | PASS | Functional validation passes |
| **TC-9.6** | Security | API Client Key authenticity verification | 1. Send request to /api/events without X-API-Key header\n2. Observe status | Returns HTTP 401 Unauthorized; direct API access bypasses are blocked | PASS | Functional validation passes |
| **TC-9.7** | UI / Visual | Send All Invites Submit Button Spinner Audit | 1. Open Send All modal\n2. Click Send\n3. Verify spinner | FAIL: Bulk send button disables but misses the standardized isLoading spinner. | FAIL | Omitted standardized isLoading prop |

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
