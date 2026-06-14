# QA Test Cases: Sprint 6 - AWS S3 Cloud Storage & Multiple Event Curator Roles

## 1. Feature Coverage Summary
Curator roles configuration, Collaborator/Viewer permissions, approval pipelines, and invitation acceptance flow.

### Mapped User Stories
- **US-6.1**: Multiple Event Curator Roles
- **US-6.2**: Viewer Restricted Access
- **US-6.3**: Collaborator Proposal Draft
- **US-6.4**: Organizer Approvals Queue
- **US-6.5**: Invitation Acceptance Banner

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-6.1** | US-6.2 | Verify Viewer role permissions restrictions | 1. Log in as Viewer\n2. Open budget panel\n3. Verify Add/Edit actions are hidden | All mutating buttons are hidden/disabled, read-only view enforced | PASS | Functional verification passes |
| **TC-6.2** | US-6.3 | Verify Collaborator edit submits change proposals | 1. Log in as Collaborator\n2. Edit budget component\n3. Submit changes | Does not modify records directly; creates a pending proposal request | PASS | Functional verification passes |
| **TC-6.3** | US-6.4 | Verify Organizer can approve change proposals | 1. Log in as Organizer\n2. Open Approvals tab\n3. Click Approve | Proposal status is committed, budget updates immediately | PASS | Functional verification passes |
| **TC-6.4** | Button Loading | Verify curator invite button loading behavior | 1. Enter invite details\n2. Click Invite Curator\n3. Check button | Button disables and shows spinner using isLoading prop during network call | FAIL | Omitted standardized isLoading prop |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `EventCuratorsCanvas.tsx`
  - **Button Label**: "Invite Curator"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={inviteLoading} but lacks the standardized isLoading prop.
- **Component**: `EventCuratorsCanvas.tsx`
  - **Button Label**: "Revoke Curator"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={deleteLoading} but lacks the standardized isLoading prop.
- **Component**: `EventApprovalsCanvas.tsx`
  - **Button Label**: "Approve / Reject"
  - **Status**: **FAIL**
  - **Observations**: Actions use disabled but omit the standardized isLoading prop.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `EventCuratorsCanvas.tsx` ("Invite Curator") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `EventCuratorsCanvas.tsx` ("Revoke Curator") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `EventApprovalsCanvas.tsx` ("Approve / Reject") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
