# QA Test Cases: Sprint 8 - Workspace Security Upgrades (CSP & Cryptographic Role Verification)

## 1. Feature Coverage Summary
Strict Content Security Policy (CSP), Cryptographically signed curator role JWT tokens, and backend header token validation.

### Mapped User Stories
- **US-8.1**: Content Security Policy
- **US-8.2**: Signed Curator Role Token
- **US-8.3**: Frontend Token Decoding & Integration
- **US-8.4**: Backend Role Token Validation

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-8.1** | Security | Strict CSP header presence | 1. Load dashboard home\n2. Check browser network response headers | Response headers include Content-Security-Policy with strict script/frame src limits | PASS | Functional validation passes |
| **TC-8.2** | Security | CSP injection block validation | 1. Try to inject external inline script `<script src='http://malicious.com'></script>`\n2. Observe browser behavior | Browser console logs CSP block exception; script download is blocked | PASS | Functional validation passes |
| **TC-8.3** | Security | Cryptographic signed curator role token validation | 1. Select event workspace\n2. Examine API request headers for X-Event-Role-Token | API passes a valid signed JWT containing event permissions claims | PASS | Functional validation passes |
| **TC-8.4** | Security | Signed token tampering protection | 1. Manually edit role token in browser cookie to change role to OWNER\n2. Submit budget edit API request | Backend signature check fails; returns HTTP 403 Forbidden blocking escalation | PASS | Functional validation passes |
| **TC-8.5** | Business Logic | Frontend role token base64 decoding layout updates | 1. Log in as Viewer\n2. Open workspace budget page | Client-side decodes role token, hides add/edit controls to enforce read-only | PASS | Functional validation passes |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `EventBudgetCanvas.tsx`
  - **Button Label**: "Edit / Add Components"
  - **Status**: **FAIL**
  - **Observations**: Workspace mutating actions do not use the standardized isLoading prop on their buttons.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `EventBudgetCanvas.tsx` ("Edit / Add Components") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
