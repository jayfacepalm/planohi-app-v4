# QA Test Cases: Sprint 8 - Workspace Security Upgrades (CSP & Cryptographic Role Verification)

## 1. Feature Coverage Summary
Strict Content Security Policy (CSP), Cryptographically signed curator role tokens (JWT), frontend role decoding, and backend role validation.

### Mapped User Stories
- **US-8.1**: Content Security Policy
- **US-8.2**: Signed Curator Role Token
- **US-8.3**: Frontend Token Decoding & Integration
- **US-8.4**: Backend Role Token Validation

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-8.1** | US-8.1 | Verify Content Security Policy headers presence | 1. Inspect dashboard network headers in DevTools | Returns Strict Content Security Policy limiting scripts, styles, and frames source roots | PASS | Functional verification passes |
| **TC-8.2** | US-8.3 | Verify client-side decoding of signed role JWT | 1. Open event workspace as Collaborator\n2. Observe available features | Frontend decodes X-Event-Role-Token, matches permissions and adapts UI layout | PASS | Functional verification passes |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `EventBudgetCanvas.tsx`
  - **Button Label**: "Edit / Add Components"
  - **Status**: **FAIL**
  - **Observations**: Workspace mutating actions do not use the standardized isLoading prop on their buttons.
- **Component**: `EventTimelineCanvas.tsx`
  - **Button Label**: "Add Task"
  - **Status**: **FAIL**
  - **Observations**: Mutating timeline buttons lack the standardized isLoading prop.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `EventBudgetCanvas.tsx` ("Edit / Add Components") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `EventTimelineCanvas.tsx` ("Add Task") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
