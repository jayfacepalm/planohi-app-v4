# QA Test Cases: Sprint 3 - Component Tracking & Timeline Canvas

## 1. Feature Coverage Summary
Logging transaction spendings, budget side-by-side status calculation highlights, timeline task additions, and completion progress metrics.

### Mapped User Stories
- **US-3.1**: Log Spending
- **US-3.2**: Budget vs Actual Analytics
- **US-3.3**: Timeline Task Addition
- **US-3.4**: Milestone Progress Toggle

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-3.1** | UI / Zod Validation | Log Spending validations | 1. Open Log Spending modal\n2. Log amount as 0 or blank description\n3. Save | Form validator prevents submission; fields highlight in red | PASS | Functional validation passes |
| **TC-3.2** | Business Logic | Side-by-side actual spending updates | 1. Add a component (estimate: 2000)\n2. Log spending A (1000) and spending B (800) under component\n3. Verify total spent | Component actual cost shows 1800; status highlights green (under budget) | PASS | Functional validation passes |
| **TC-3.3** | Business Logic | Over budget visual highlight check | 1. Log additional spending C (500) under component from TC-3.2\n2. Verify total spent | Total spent updates to 2300; component card borders highlight red indicating over-budget alert status | PASS | Functional validation passes |
| **TC-3.4** | DB Constraints | Cascade deletions on spending logs | 1. Delete a component in database\n2. Verify related spendings tables | All spendings linked to that component are cascade deleted in database | PASS | Functional validation passes |
| **TC-3.5** | Business Logic | Timeline Task Addition | 1. Create task with past due date\n2. Verify chronology | Task is successfully saved and sorted in ascending order of due date | PASS | Functional validation passes |
| **TC-3.6** | Business Logic | Milestone completion progress logic | 1. Create 5 milestones\n2. Toggle completion on 3 milestones\n3. Verify completion header | Header calculations update to show exactly 60% completion metric badge | PASS | Functional validation passes |
| **TC-3.7** | UI / Visual | Add Component Button Spinner Audit | 1. Open Add Component modal\n2. Fill fields, click save\n3. Check spinner | FAIL: AddComponentModal submit button disables but misses the standardized isLoading spinner. | FAIL | Omitted standardized isLoading prop |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `AddComponentModal.tsx`
  - **Button Label**: "Add Component"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `AddComponentModal.tsx` ("Add Component") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
