# QA Test Cases: Sprint 1 - Security & Authentication Canvas

## 1. Feature Coverage Summary
Registration initiation, OTP verification, login, and secure session validation.

### Mapped User Stories
- **US-1.1**: Registration Initiation & OTP Request
- **US-1.2**: OTP Verification & Registration Completion
- **US-1.3**: Dashboard Login
- **US-1.4**: Persistent Secure Session

## 2. Test Cases Specification

| Test ID | User Story / Component | Test Scenario | Steps to Execute | Expected Outcome | Status (PASS/FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-1.1** | US-1.1 | Verify registration credentials submission initiates OTP request | 1. Navigate to /register\n2. Enter valid email, alias, and password\n3. Click 'Proceed' | Invokes POST /api/auth/register/otp, transitions UI to OTP entry, disables button while submitting | PASS | Functional verification passes |
| **TC-1.2** | US-1.2 | Verify OTP verification completes registration | 1. Complete TC-1.1\n2. Enter correct OTP\n3. Click 'Submit' | Invokes POST /api/auth/register, creates account, sets cookie, redirects to dashboard | PASS | Functional verification passes |
| **TC-1.3** | US-1.3 | Verify login form submission | 1. Navigate to /login\n2. Enter valid credentials\n3. Click 'Sign In' | Invokes POST /api/auth/login, sets AUTH_TOKEN cookie, redirects to dashboard | PASS | Functional verification passes |
| **TC-1.4** | US-1.4 | Verify persistent session redirection | 1. Authenticate user\n2. Navigate to /\n3. Verify page auto-redirects | Automatically redirects to /events due to valid AUTH_TOKEN cookie | PASS | Functional verification passes |
| **TC-1.5** | Button Loading | Verify login button loading behavior | 1. Navigate to /login\n2. Submit login\n3. Check button status during fetch | Button should disable and show neon spinner using the isLoading prop | FAIL | Omitted standardized isLoading prop |

## 3. Button Loading & UI Verification Audits

### Button Audit Details
- **Component**: `LoginForm.tsx`
  - **Button Label**: "Sign In"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `RegisterForm.tsx`
  - **Button Label**: "Proceed (Credentials)"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `RegisterForm.tsx`
  - **Button Label**: "Submit (OTP Verification)"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.
- **Component**: `LogoutButton.tsx`
  - **Button Label**: "Log Out"
  - **Status**: **FAIL**
  - **Observations**: Uses disabled={loading} but lacks the standardized isLoading prop.

### Visual UI Check Logs (Code Review Verification)
- Code review verifies that button elements trigger async operations but fail to use the standardized `isLoading` prop.
  - `LoginForm.tsx` ("Sign In") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `RegisterForm.tsx` ("Proceed (Credentials)") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `RegisterForm.tsx` ("Submit (OTP Verification)") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
  - `LogoutButton.tsx` ("Log Out") uses manual local state controls for `disabled` but misses spinner feedback and standard `isLoading` handling.
