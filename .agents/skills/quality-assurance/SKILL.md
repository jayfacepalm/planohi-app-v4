---
name: quality-assurance
description: Guidelines and rules for acting as a Quality Assurance officer to test web applications. Create test cases from sprint documents, perform static analysis on React components for button loading behaviors, and log findings.
---

# Quality Assurance (QA) Officer Skill

Use this skill when tasked with QA testing, auditing UI behaviors, creating test cases from sprint documents, and checking interface loading indicators.

## Core QA Mandate
1. **Sprint Analysis**: Parse user stories, database schemas, backend REST APIs, and frontend pages listed in sprint documents (`docs/sprints/sprint-[X].md`).
2. **Test Case Specification**: Draft detailed, structured test cases detailing conditions, inputs, expected results, and verification criteria in `docs/qa/test-cases/sprint-[X].md`.
3. **Button Loading Audits**:
   - Inspect components and pages for asynchronous actions (form submission, API requests, modals actions).
   - Verify that the shared `<Button>` component utilizes the `isLoading` prop correctly.
   - Ensure buttons are disabled during loading to prevent double-submissions.
   - Do NOT edit functional feature code on failure; log missing loading indicators as test failures.

---

## Test Case Structure (`docs/qa/test-cases/sprint-[X].md`)

Each sprint's test document must use the following standard format:

```markdown
# QA Test Cases: Sprint [X] - [Sprint Title]

## 1. Feature Coverage Summary
Briefly list the User Stories and components analyzed in this sprint.

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-[X].1** | US-[X].1 | [Scenario] | 1. Step 1<br>2. Step 2 | [Expected result] | PASS | |
| **TC-[X].2** | Button Loading | Verify loading state | 1. Trigger action<br>2. Check button loading | Button disables, shows neon spinner | FAIL | Omitted `isLoading` prop |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
* **Component**: `LoginForm.tsx`
  - **Button Label**: "Sign In"
  - **Loading Status**: PASS (Uses `isLoading` correctly linked to `isSubmitting`).
* **Component**: `RegisterForm.tsx`
  - **Button Label**: "Proceed"
  - **Loading Status**: FAIL (Omitted `isLoading` prop on credentials submit button).

### Visual UI Check Logs (Browser / Code Review)
- Code check confirms `LoginForm.tsx` has correct state handling.
- Registration Form has credentials verification click action that does not trigger state spinner.
```

---

## Final QA Sprint Report Template (`docs/qa/qa-sprint-report.md`)

Compile audit results into a master report:

```markdown
# QA Sprint Audit Summary Report

This document compiles the verification results of button loading states and test coverage for Sprints 1 to 10.

## Overall Summary

- **Total Test Cases**: [Count]
- **Passed Sprints**: [List]
- **Failed Sprints (UI issues)**: [List]

## Summary Table

| Sprint | Title | Total Test Cases | Passed | Failed | Omitted Button Loading Found |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Sprint 1** | Security & Auth | 8 | 6 | 2 | `RegisterForm.tsx` (Proceed button) |
...
```
