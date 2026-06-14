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
| **TC-10.1** | US-10.1 | Verify Correlation ID propagation across services | 1. Submit login request\n2. Examine console logs for next-proxy, spring-api, and workers | All logs for that transaction carry the identical 16-character correlation ID | PASS | Functional verification passes |
| **TC-10.2** | US-10.2 | Verify email masking in UI and console logs | 1. View guest details page\n2. Inspect guest email representation\n3. Search application console outputs | Emails display as masked (e.g. j****@***.com) on UI text and system logger streams | PASS | Functional verification passes |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `General`
  - **Button Label**: "Log Tracking"
  - **Status**: **PASS**
  - **Observations**: Mainly logging and backend tracking; no active button UI actions in scope.

### Visual UI Check Logs (Code Review Verification)
- Code review confirms no interactive asynchronous actions are mapped to buttons for this sprint.
