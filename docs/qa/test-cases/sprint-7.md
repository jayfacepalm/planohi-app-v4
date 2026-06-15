# QA Test Cases: Sprint 7 - User Alias Dropdown & Email Notifications Microservice

## 1. Feature Coverage Summary
Server-side AUTH_TOKEN validation dropdowns, RabbitMQ AMQP event dispatches, Spring Boot standalone templates compilation, and SMTP local capturing.

### Mapped User Stories
- **US-7.1**: Navbar Profile Menu
- **US-7.2**: Infrastructure Broker Integration
- **US-7.3**: Notification Message Publisher
- **US-7.4**: Email Consumer Microservice
- **US-7.5**: Local Webmail Capture

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-7.1** | UI / Business Logic | Navbar active profile decoding display | 1. Log in as 'organizer@planohi.com'\n2. Inspect Navbar upper right dropdown text | Dropdown shows user display alias decoded from the server-side AUTH_TOKEN claims | PASS | Functional validation passes |
| **TC-7.2** | Infrastructure | RabbitMQ container health check | 1. Check docker container list\n2. Verify healthcheck status | RabbitMQ reports healthy status before main API initializes rabbit connection | PASS | Functional validation passes |
| **TC-7.3** | Business Logic | Event notification message publisher dispatch | 1. Trigger registration OTP request on UI\n2. Inspect RabbitMQ manager admin dashboard | Publish action puts notification event payload in queue planohi.emails without delay | PASS | Functional validation passes |
| **TC-7.4** | Business Logic | Email consumer template variables placeholder replacements | 1. Email queue processes message\n2. Check placeholder substitutions | Microservice queries template, replaces `${alias}` / `${otp}` with transaction metadata | PASS | Functional validation passes |
| **TC-7.5** | Infrastructure | SMTP capture sandbox Maildev inbox | 1. Submit registration OTP or guest RSVP invitation\n2. Open localhost:1080 webmail interface | E2E email dispatch arrives in Maildev inbox showing correct subject and html content layout | PASS | Functional validation passes |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `Navbar.tsx`
  - **Button Label**: "Profile Toggle"
  - **Status**: **PASS**
  - **Observations**: Navbar profile dropdown is client-side local toggling; no async action trigger needed.

### Visual UI Check Logs (Code Review Verification)
- Code review confirms no interactive asynchronous actions are mapped to buttons for this sprint.
