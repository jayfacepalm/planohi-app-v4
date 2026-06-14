# QA Test Cases: Sprint 4 - RSVP Management & Guest Canvas

## 1. Feature Coverage Summary
Inviting guests, copying secure unique RSVP links, login-free guest response portals, party size validation, and real-time attendee statistics.

### Mapped User Stories
- **US-4.1**: Guest Invitation Setup
- **US-4.2**: Secure Invitation Links
- **US-4.3**: Login-Free Public RSVP
- **US-4.4**: Party Size Selection
- **US-4.5**: Real-time Attendee Analytics

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-4.1** | US-4.2 | Verify copy guest link action | 1. Click copy link icon next to guest\n2. Paste in browser clipboard | Copies unique public link containing guest token | PASS | Functional verification passes |
| **TC-4.2** | US-4.3 | Verify login-free guest RSVP portal | 1. Navigate to copied token link\n2. Confirm details load\n3. Click 'Attending' | Renders landing layout, loads custom guest metadata without authentication | PASS | Functional verification passes |
| **TC-4.3** | US-4.4 | Verify guest party size selection limits | 1. On RSVP page, check max headcount\n2. Attempt to select headcount higher than allowed | UI limits selection or validation blocks exceeding allowed party limit | PASS | Functional verification passes |
| **TC-4.4** | Button Loading | Verify RSVP Submit loading state | 1. Complete RSVP form\n2. Click submit button\n3. Observe button loading state | Submit button disables and shows neon spinner using isLoading prop | FAIL | Omitted standardized isLoading prop |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `AddInviteeModal.tsx`
  - **Button Label**: "Add Guest"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `InvitationsBanner.tsx`
  - **Button Label**: "Accept/Decline"
  - **Status**: **FAIL**
  - **Observations**: Action buttons use disabled={loading} but lack isLoading prop.
- **Component**: `RsvpClient.tsx`
  - **Button Label**: "Submit RSVP"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={isSubmitting} but lacks the standardized isLoading prop.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `AddInviteeModal.tsx` ("Add Guest") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `InvitationsBanner.tsx` ("Accept/Decline") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `RsvpClient.tsx` ("Submit RSVP") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
