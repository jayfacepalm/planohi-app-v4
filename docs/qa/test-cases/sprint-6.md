# QA Test Cases: Sprint 6 - AWS S3 Cloud Storage & Multiple Event Curator Roles

## 1. Feature Coverage Summary
Multiple curator permissions (Collaborator/Viewer), direct mutations restrictions, change proposals logic, organizer approvals queue, and invitation banners.

### Mapped User Stories
- **US-6.1**: Multiple Event Curator Roles
- **US-6.2**: Viewer Restricted Access
- **US-6.3**: Collaborator Proposal Draft
- **US-6.4**: Organizer Approvals Queue
- **US-6.5**: Invitation Acceptance Banner

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-6.1** | Security / Roles | Viewer restricted access verification | 1. Log in as Viewer\n2. Navigate to budget or guest list workspaces | All mutating buttons are hidden/disabled; reads canvas details as read-only | PASS | Functional validation passes |
| **TC-6.2** | Security / Roles | Collaborator mutation request validation | 1. Log in as Collaborator\n2. Edit component budget or guest limit\n3. Click save | Database records remain unmodified; changes are submitted as a pending proposal record | PASS | Functional validation passes |
| **TC-6.3** | Business Logic | Approvals queue change proposal commits | 1. Log in as Owner\n2. Navigate to approvals tab\n3. Click Approve on collaborator proposal | Commits change to live event; component details update immediately | PASS | Functional validation passes |
| **TC-6.4** | Business Logic | Approvals queue change proposal rejection | 1. Log in as Owner\n2. Open approvals\n3. Click Reject on collaborator proposal | Discards proposal; no records are modified on the event database workspace | PASS | Functional validation passes |
| **TC-6.5** | UI / Business Logic | Workspace invitation display banner | 1. Invite new user to event\n2. New user logs in\n3. Observe home dashboard | Banner displays invitation notification with Accept and Decline buttons | PASS | Functional validation passes |
| **TC-6.6** | Business Logic | Accept event invitation flows | 1. Click Accept on invitation banner\n2. Open events list | Grant curator rights; event is added to user's dashboard view list | PASS | Functional validation passes |
| **TC-6.7** | UI / Visual | Curator Invite button loading spinner audit | 1. Open Curators tab\n2. Input invite details, click Invite Curator\n3. Check spinner | FAIL: Invite button disables but lacks the standardized isLoading prop spinner. | FAIL | Omitted standardized isLoading prop |

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
