# QA Test Cases: Sprint 3 - Component Tracking & Timeline Canvas

## 1. Feature Coverage Summary
Logging expenditures (Spendings), comparing budget vs actual spent, timeline checklist tasks, and milestone progress.

### Mapped User Stories
- **US-3.1**: Log Spending
- **US-3.2**: Budget vs Actual Analytics
- **US-3.3**: Timeline Task Addition
- **US-3.4**: Milestone Progress Toggle

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-3.1** | US-3.1 | Log a spending against a component | 1. Open Budget Canvas\n2. Click 'Log Spending' on component\n3. Fill amount and description\n4. Save | POSTs to spending endpoint, updates component spending and actual cost dashboard | PASS | Functional verification passes |
| **TC-3.2** | US-3.2 | Compare budget vs actual spent highlights | 1. Observe budget category item\n2. Verify text color when actual spent > estimated | Displays red alert border or badge when spending exceeds estimated components budget | PASS | Functional verification passes |
| **TC-3.3** | US-3.3 | Verify adding a milestone to chronological timeline | 1. Open Timeline Canvas\n2. Click 'Add Milestone'\n3. Enter description\n4. Save | Adds task chronologically, updates timeline list | PASS | Functional verification passes |
| **TC-3.4** | Button Loading | Verify Add Component button loading behavior | 1. Open Add Component modal\n2. Submit form\n3. Check button status | Button disables and shows spinner using isLoading prop during request | FAIL | Omitted standardized isLoading prop |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `AddComponentModal.tsx`
  - **Button Label**: "Add Component"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `EventTimelineCanvas.tsx`
  - **Button Label**: "Add Task"
  - **Status**: **PASS**
  - **Observations**: Button opens the Add Task modal; loading is handled in the modal submit button.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `AddComponentModal.tsx` ("Add Component") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
