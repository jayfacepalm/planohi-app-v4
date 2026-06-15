# QA Test Cases: Sprint 4 - RSVP Management & Guest Canvas

## 1. Feature Coverage Summary
Guest allocations and headcount limit validation, copying secure unique RSVP token URLs, login-free response portals, and real-time dashboard analytics.

### Mapped User Stories
- **US-4.1**: Guest Invitation Setup
- **US-4.2**: Secure Invitation Links
- **US-4.3**: Login-Free Public RSVP
- **US-4.4**: Party Size Selection
- **US-4.5**: Real-time Attendee Analytics

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-4.1** | UI / Zod Validation | Add Guest details validation | 1. Open Add Guest modal\n2. Input empty name or 0 headcount\n3. Click save | Zod validator blocks submit; prints fields constraint warning | PASS | Functional validation passes |
| **TC-4.2** | Security | Guest secure link hash uniqueness | 1. Add guest A and guest B\n2. Click Copy Link for both\n3. Compare copied URLs | Each link is unique, containing /rsvp/[uuid-token] mapping back to separate records | PASS | Functional validation passes |
| **TC-4.3** | Security | Login-free Guest Portal verification | 1. Open copied RSVP URL in incognito/separate browser session\n2. Check navigation | Loads portal directly without prompting for planner login or credentials | PASS | Functional validation passes |
| **TC-4.4** | Business Logic | RSVP Headcount submission - Attending | 1. On RSVP portal, select Attending\n2. Select party headcount 2\n3. Submit RSVP | Submits status, sets guest record as confirmed, updates dashboard headcounts immediately | PASS | Functional validation passes |
| **TC-4.5** | Business Logic | RSVP Headcount boundary check | 1. Guest headcount limit is set to 3\n2. Attempt to select headcount 4 on RSVP portal\n3. Submit RSVP | UI selector limits option or submit validation prevents exceeding allowed party size limit | PASS | Functional validation passes |
| **TC-4.6** | Business Logic | RSVP Response - Declined | 1. On RSVP portal, select Declined\n2. Observe headcount limit\n3. Submit RSVP | Submits status as Declined; actual confirmed guest headcount contribution resets to 0 | PASS | Functional validation passes |
| **TC-4.7** | Business Logic | Real-time attendee stats verification | 1. View organizer Guest dashboard metrics\n2. Compare with RSVP confirmations | Displays correct counts of Expected Guests, Confirmed Attending, Declined, and Pending responses | PASS | Functional validation passes |
| **TC-4.8** | UI / Visual | RSVP Portal Submit Button Spinner Audit | 1. Open guest RSVP page\n2. Fill choices, click Confirm Selection\n3. Check spinner | FAIL: RSVP submit button disables but does not render the isLoading prop spinner animation. | FAIL | Omitted standardized isLoading prop |

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
