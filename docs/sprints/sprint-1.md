# Sprint 1: Security & Authentication Canvas

This sprint establishes the registration, login, JWT token generation, cookie storage, and session validation pipelines for the Planohi app.

---

## 1. Goal
Implement a fully secure, stateless authentication flow. Organizers can register and log in to manage their dashboard. Sessions are verified using a JWT stored in an HttpOnly cookie.

---

## 2. User Stories
* **US-1.1 (Registration Initiation & OTP Request)**: As a registering event organizer, I want to fill in my email, alias, and password and press proceed to request a one-time password (OTP) so that a secure code is generated and cached for verification.
* **US-1.2 (OTP Verification & Registration Completion)**: As a registering event organizer, I want to enter the OTP I received and press submit to complete registration, verifying the code against the cached record before my account is created.
* **US-1.3 (Dashboard Login)**: As a registered event organizer, I want to log in using my credentials so that I can access my event management dashboard.
* **US-1.4 (Persistent Secure Session)**: As a logged-in event organizer, I want my session to remain secure and persistent via secure cookies so that I do not have to log in repeatedly when navigating the app.

---

## 3. Database Schema (PostgreSQL)

### Table: `user_account`
* Defines user credentials.
* Primary Key uses UUID version 7.
* Incorporates `BaseAuditEntity` columns for automated auditing tracking.

```sql
CREATE TABLE user_account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Or custom UUID v7 generator function
    email VARCHAR(255) UNIQUE NOT NULL,
    alias VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);
CREATE INDEX idx_user_account_email ON user_account(email);
```

---

## 4. Backend REST APIs

### 1. Initiate Registration (Generate & Cache OTP)
* **Endpoint**: `POST /api/auth/register/otp`
* **Request Payload**:
  ```json
  {
    "email": "organizer@example.com",
    "password": "StrongPassword123!",
    "alias": "some Alias"
  }
  ```
* **Behavior**:
  - Validates email uniqueness/format and password strength.
  - Generates a cryptographically secure 6-digit OTP (One-Time Password).
  - Caches the OTP in Redis/Cache with the email as the identifier (e.g., key `planohi:otp::organizer@example.com`), setting a short TTL (e.g., 5 minutes).
  - Logs the OTP to the console/system logger (since this is beta/local environment testing, allowing easy testing access).
* **Response**: `200 OK`

### 2. Complete Registration (Verify OTP & Create User)
* **Endpoint**: `POST /api/auth/register`
* **Request Payload**:
  ```json
  {
    "email": "organizer@example.com",
    "password": "StrongPassword123!",
    "alias": "some Alias",
    "otp": "123456"
  }
  ```
* **Behavior**:
  - Checks if the OTP for the given email exists in the cache and matches the payload `otp`.
  - If match is invalid or expired, throws an exception (e.g. `Invalid OTP code`).
  - If match is successful:
    - Validates email uniqueness/format and password strength again to prevent parameter tampering.
    - Hashes the password using BCrypt.
    - Persists the new record into `user_account`.
    - Evicts the OTP from cache to prevent reuse.
    - Generates a stateless JWT containing the user `id`, `email`, and `alias` claims.
    - Injects the auto-login session cookie into the HTTP response:
      - Name: `AUTH_TOKEN`
      - Value: `<jwt-token>` (raw JWT token string)
      - Attributes: `HttpOnly`, `Secure` (in prod), `SameSite=Strict`, `Path=/`
* **Response**: `201 Created`

### 3. Login User
* **Endpoint**: `POST /api/auth/login`
* **Request Payload**:
  ```json
  {
    "email": "organizer@example.com",
    "password": "StrongPassword123!"
  }
  ```
* **Behavior**:
  - Validates email existence and BCrypt password hash.
  - Generates a stateless JWT containing the user `id`, `email`, and `alias` claims.
  - Injects a cookie into the HTTP response:
    - Name: `AUTH_TOKEN`
    - Value: `<jwt-token>` (raw JWT token string)
    - Attributes: `HttpOnly`, `Secure` (in prod), `SameSite=Strict`, `Path=/`
  - The backend resolves the session by extracting the token from the `AUTH_TOKEN` cookie instead of parsing the HTTP `Authorization` header.
* **Response**: `200 OK`

### 4. Logout User
* **Endpoint**: `POST /api/auth/logout`
* **Behavior**:
  - Injects a cookie to clear the user session:
    - Name: `AUTH_TOKEN`
    - Value: `""`
    - Attributes: `HttpOnly`, `Secure` (in prod), `SameSite=Strict`, `Path=/`, `Max-Age=0`
* **Response**: `204 No Content`

---

## 5. Frontend & Layout Work

* **Login View (`/login`)**:
  - Renders email and password inputs (using our custom `Input` components).
  - Integrates client-side Zod validation.
  - Submits credentials via Next.js wildcard handlers to bypass CORS.
* **Registration View (`/register` / 2-Part Stepper UI)**:
  - **Part 1 (Credentials State)**:
    - Renders input fields for email, alias, and password.
    - User presses "Proceed", calling the `/api/auth/register/otp` endpoint.
    - Upon success, transitions the form to Part 2.
  - **Part 2 (OTP Verification State)**:
    - Displays an OTP input field (using the custom `OTPInput` component) to fill in the 6-digit code.
    - Includes a **Resend OTP** action (re-calls the Part 1 endpoint) and a **Back to credentials** trigger (allows editing email/alias/password).
    - User presses "Submit", calling the `/api/auth/register` endpoint with the credentials and the OTP.
    - If valid, the user is registered, automatically logged in via the returned `AUTH_TOKEN` cookie, and redirected immediately to the dashboard. If invalid, displays a clear error state/validation message.
* **Navigation Protection & User Display**:
  - The Next.js server-side middleware and layouts access the HttpOnly `AUTH_TOKEN` cookie directly from the request headers to verify navigation rights.
  - Server Components decode the stateless JWT to read the user's `alias` claim, rendering it directly in the header layout without requiring client-side API checks.
