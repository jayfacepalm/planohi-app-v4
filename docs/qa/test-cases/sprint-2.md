# QA Test Cases: Sprint 2 - Event Profiles & Budgeting Canvas

## 1. Feature Coverage Summary
Creating event profiles, S3/local banner upload, dashboard searches and page query caching, category components budgeting, and database aggregation.

### Mapped User Stories
- **US-2.1**: Create Event
- **US-2.2**: Local Banner Upload & Protection
- **US-2.3**: Events Dashboard List
- **US-2.4**: Event Components Breakdown
- **US-2.5**: Aggregated Estimated Cost
- **US-2.6**: Landing Page & Redirection

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-2.1** | UI / Zod Validation | Create Event validation schema limits | 1. Open Create Event modal\n2. Submit blank title or description\n3. Click Save | Form shows title required error; modal does not close | PASS | Functional validation passes |
| **TC-2.2** | Business Logic | Create Event with past dates boundary checks | 1. Set Event Start Date to yesterday\n2. Set Event End Date to today\n3. Click Save | Zod or API validation blocks past date initialization (dates must be future) | PASS | Functional validation passes |
| **TC-2.3** | API Validation | Banner Upload size check | 1. Select image larger than 2MB\n2. Upload via S3/local endpoint | API blocks upload and returns HTTP 400 / size exceeded payload | PASS | Functional validation passes |
| **TC-2.4** | Security | Banner Protected route verification | 1. Attempt to fetch /api/public/rsvp/banner?token=[invalid] without session\n2. Observe response | Returns HTTP 403 Forbidden; public banner requires verified guest token | PASS | Functional validation passes |
| **TC-2.5** | Business Logic | Events list paging search query params | 1. Enter search text 'QA'\n2. Check browser address bar | Query parameters updated to ?search=QA; dashboard filters event items list | PASS | Functional validation passes |
| **TC-2.6** | DB Constraints | Save Event Component estimated budget limits | 1. Create component with negative estimate value\n2. Click save | Database/Zod schema validation prevents saving component cost values <= 0 | PASS | Functional validation passes |
| **TC-2.7** | DB / Calculations | Aggregated Estimated Cost dynamic calculations | 1. Add component A (est: 1000) and component B (est: 2500)\n2. Load workspace page | Dynamic sum queries calculate aggregate total cost as 3500; prints on header UI | PASS | Functional validation passes |
| **TC-2.8** | Security | Auto redirection from App landing page | 1. Log in with active session\n2. Navigate to /\n3. Check URL | Automatically detects active AUTH_TOKEN and redirects planner to /events | PASS | Functional validation passes |
| **TC-2.9** | UI / Visual | Create Event Button Spinner Audit | 1. Fill Create Event modal\n2. Click Create Event\n3. Verify spinner | FAIL: CreateEventModal submit button disables but does not render the isLoading prop spinner. | FAIL | Omitted standardized isLoading prop |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `CreateEventModal.tsx`
  - **Button Label**: "Create Event"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `CreateEventModal.tsx` ("Create Event") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
