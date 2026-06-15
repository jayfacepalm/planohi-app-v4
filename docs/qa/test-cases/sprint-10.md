# QA Test Cases: Sprint 10 - Log Tracing, Email Masking & Activity Logs Audit

## 1. Feature Coverage Summary
Correlation ID request log tracing propagation, secure client-side and log-level email masking, and activity audit trails storage.

### Mapped User Stories
- **US-10.1**: Correlation ID Log Tracing
- **US-10.2**: Strict Email Masking
- **US-10.3**: Activity Audit Log

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-10.1** | Security | Correlation ID log propagation tracing | 1. Trigger API request\n2. Inspect Next.js proxy, API server, and RabbitMQ logs | Logs for the execution carry the identical 16-character alphanumeric correlation ID | PASS | Functional validation passes |
| **TC-10.2** | Security | Client-side email masking | 1. Open guest list page\n2. Inspect guest email text | Displays masked characters (e.g. t*****@***.com) preventing client exposure | PASS | Functional validation passes |
| **TC-10.3** | Security | Log-level email masking validation | 1. View system log files under build directory\n2. Search guest email strings | All guest emails are masked in output logs to protect privacy | PASS | Functional validation passes |
| **TC-10.4** | DB Constraints | Activity Audit log storage CUD events | 1. Create, edit, or delete an event/budget component\n2. Query database activity logs table | Creates structured audit record detailing transaction action, timestamp, entity, and actor | PASS | Functional validation passes |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `General`
  - **Button Label**: "Log Tracking"
  - **Status**: **PASS**
  - **Observations**: Mainly logging and backend tracking; no active button UI actions in scope.

### Visual UI Check Logs (Code Review Verification)
- Code review confirms no interactive asynchronous actions are mapped to buttons for this sprint.
