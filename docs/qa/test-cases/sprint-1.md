# QA Test Cases: Sprint 1 - Security & Authentication Canvas

## 1. Feature Coverage Summary
Registration initiation, OTP verification, user profile database creation, persistent session cookies, and catch-all router middleware.

### Mapped User Stories
- **US-1.1**: Registration Initiation & OTP Request
- **US-1.2**: OTP Verification & Registration Completion
- **US-1.3**: Dashboard Login
- **US-1.4**: Persistent Secure Session

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-1.1** | UI / Zod Validation | Initiate Registration with invalid inputs | 1. Open /register\n2. Input empty email and short password (<8 chars)\n3. Click Proceed | Zod client errors display immediately; submit button remains inactive | PASS | Functional validation passes |
| **TC-1.2** | API Validation | Initiate Registration with existing email | 1. POST /api/auth/register/otp with email already in DB\n2. Verify response status | API returns HTTP 400 Bad Request with unique email error payload | PASS | Functional validation passes |
| **TC-1.3** | Business Logic | OTP Generation and Caching | 1. Submit valid registration email\n2. Verify Redis cache record is created | Creates cache key planohi:otp::[email] with 6-digit code and 5-min TTL | PASS | Functional validation passes |
| **TC-1.4** | Business Logic | Complete registration with invalid OTP | 1. POST /api/auth/register with incorrect 6-digit OTP code\n2. Observe response | API returns HTTP 400 with 'Invalid OTP code' message; no account is persisted | PASS | Functional validation passes |
| **TC-1.5** | DB Constraints | Complete registration with correct OTP | 1. POST /api/auth/register with correct OTP\n2. Verify database records | Saves record in user_account using UUID v7, evicts Redis key, returns AUTH_TOKEN cookie | PASS | Functional validation passes |
| **TC-1.6** | Security | Dashboard Login authentication rules | 1. POST /api/auth/login with wrong password\n2. Observe response | Returns HTTP 401 Unauthorized; does not write session cookie | PASS | Functional validation passes |
| **TC-1.7** | Security | Secure Session Cookie Configuration | 1. Complete successful login\n2. Inspect AUTH_TOKEN cookie in browser developer tools | Cookie attributes must include HttpOnly, SameSite=Strict, Path=/, and Secure (in production) | PASS | Functional validation passes |
| **TC-1.8** | Security | Persistent Navigation middleware check | 1. Clear AUTH_TOKEN cookie\n2. Navigate to /events\n3. Verify redirect | Middleware catches empty token and redirects requester to /login | PASS | Functional validation passes |
| **TC-1.9** | UI / Visual | Login Button Loading Spinner Audit | 1. Open /login\n2. Click Establish Connection\n3. Verify spinner is visible | FAIL: Login submit button disables but lacks the standardized isLoading prop spinner animation. | FAIL | Omitted standardized isLoading prop |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `LoginForm.tsx`
  - **Button Label**: "Sign In"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `RegisterForm.tsx`
  - **Button Label**: "Proceed"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `LogoutButton.tsx`
  - **Button Label**: "Log Out"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `LoginForm.tsx` ("Sign In") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `RegisterForm.tsx` ("Proceed") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `LogoutButton.tsx` ("Log Out") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
