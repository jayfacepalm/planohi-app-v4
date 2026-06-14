# QA Test Cases: Sprint 7 - User Alias Dropdown & Email Notifications Microservice

## 1. Feature Coverage Summary
Navbar user profile alias dropdown, RabbitMQ integration, standalone email notifications consumer service, Maildev sandbox capture.

### Mapped User Stories
- **US-7.1**: Navbar Profile Menu
- **US-7.2**: Infrastructure Broker Integration
- **US-7.3**: Notification Message Publisher
- **US-7.4**: Email Consumer Microservice
- **US-7.5**: Local Webmail Capture

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-7.1** | US-7.1 | Verify Navbar displays active user alias | 1. Log in to dashboard\n2. Check upper right Navbar section | Displays active session user alias inside a glassmorphic menu | PASS | Functional verification passes |
| **TC-7.2** | US-7.4 | Verify registration triggers SMTP packet via RabbitMQ | 1. Initiate registration on UI\n2. Open local Maildev interface at localhost:1080 | Confirm verification email containing OTP is received in inbox | PASS | Functional verification passes |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `Navbar.tsx`
  - **Button Label**: "Profile Toggle"
  - **Status**: **PASS**
  - **Observations**: Navbar profile dropdown is purely client-side local toggling; no async action trigger needed.

### Visual UI Check Logs (Code Review Verification)
- Code review confirms no interactive asynchronous actions are mapped to buttons for this sprint.
