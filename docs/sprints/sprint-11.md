# Sprint 11: Premium Voucher Activation & User Quotas

This sprint implements a voucher activation system that allows users to upgrade their accounts from a restricted `NORMAL` user to a fully unrestricted `PREMIUM` user. It also introduces administrative voucher generation and direct database patching for account administrative roles.

---

## 1. Goals

1. **User Roles**: Establish distinct user tiers (`NORMAL`, `PREMIUM`, `ADMIN`) on user accounts to enforce tiered resource limits. The hierarchical order of privileges is:
   - **`ADMIN`**: Inherits all `PREMIUM` privileges (unlimited events and guests) plus voucher generation and administrative capabilities.
   - **`PREMIUM`**: Unrestricted platform privileges (unlimited events and guests).
   - **`NORMAL`**: Restricted quotas.
2. **Quota Guardrails**: Enforce platform restrictions for `NORMAL` users: a maximum of 3 created events, and a limit of 25 guest invitees per event. No limits are applied to `PREMIUM` and `ADMIN` users.
3. **Admin Voucher Generation**: Allow administrators to securely generate single-use, alphanumeric voucher codes with optional expiration dates.
4. **Voucher Activation Page**: Provide an interface where `NORMAL` users can enter a valid voucher code to upgrade to `PREMIUM` status instantly.
5. **No-UI Admin Provisioning**: Provide a direct database patch to elevate user accounts to the `ADMIN` role securely without exposing administrative actions in client UI code.



---

## 2. User Stories

* **US-11.1 (User Tier Roles & Limits)**: As a system operator, I want newly registered users to be default `NORMAL` users, limited to creating a maximum of 3 events and inviting at most 25 guest invitees per event. `PREMIUM` and `ADMIN` users should have no limits.
* **US-11.2 (Admin Voucher Code Generation)**: As an administrator, I want to securely generate unique, single-use voucher codes (e.g. `PLANOHI-PREM-XXXX-XXXX`) with an optional expiration date to grant users premium status.
* **US-11.3 (Activate Voucher Page)**: As a normal user, I want an "Activate Voucher" page where I can submit a voucher code to instantly upgrade my account to premium features.

---

## 3. Technical & Database Design

### 1. Database Schema
Create a new Flyway migration script `V20260625180000__add_user_roles_and_vouchers.sql` under `api/src/main/resources/db/migration`:
```sql
-- 1. Add role column to user_account
ALTER TABLE user_account ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'NORMAL';

-- 2. Create voucher table
CREATE TABLE voucher (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_by_user_id UUID NOT NULL,
    activated_by_user_id UUID,
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_voucher_created_by FOREIGN KEY (created_by_user_id) REFERENCES user_account(id) ON DELETE CASCADE,
    CONSTRAINT fk_voucher_activated_by FOREIGN KEY (activated_by_user_id) REFERENCES user_account(id) ON DELETE SET NULL
);

CREATE INDEX idx_voucher_code ON voucher(code);
```

### 2. User Account Role Enum
Define `UserRole` enum class under package `com.planohi.api.enums`:
```java
package com.planohi.api.enums;

public enum UserRole {
    NORMAL,
    PREMIUM,
    ADMIN
}
```

Add `role` field to `UserAccount.java` (using `@Enumerated(EnumType.STRING)`):
```java
@Enumerated(EnumType.STRING)
@Column(name = "role", nullable = false, length = 20)
private UserRole role = UserRole.NORMAL;
```

Update `UserDto.java` to carry the user's role:
```java
private UserRole role;
```

### 3. JWT Payload Integration
Update `JwtService.java` to encode the user's role in the JWT claims payload under key `role`. This enables Next.js edge middleware and server components to check quotas and role access directly from the session cookie without database roundtrips:
```java
    public String generateToken(UUID userId, String email, String alias, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", userId.toString());
        claims.put("alias", alias);
        claims.put("role", role);

        return Jwts.builder()
                .claims(claims)
                .subject(email)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey())
                .compact();
    }
```
Update `AuthServiceImpl.java` to pass `account.getRole().name()` when invoking `generateToken`.

### 4. Admin Provisioning statement (No UI)
To make a user an Admin without showing any UI code, a direct database patch will be run on the database:
```sql
UPDATE user_account SET role = 'ADMIN' WHERE email = 'target-admin@example.com';
```

---

## 4. API Backend Upgrades (Spring Boot)

### 1. Quota Verification & Interception
* **Event Creation Quota**: In `EventServiceImpl.createEvent`, before saving the new event:
  - Check the active user's role from the security principal.
  - If role is `NORMAL`:
    - Count existing events created by this user: `eventRepository.countByCreatedBy(userId.toString())`.
    - If count >= 3, throw a `FieldValidationException` / `IllegalArgumentException` with the message: `"Normal tier accounts are limited to a maximum of 3 events. Please activate a premium voucher to lift this limit."`
* **Guest Invitation Quota**: In `InviteeServiceImpl.addInvitees` and single invitee creations:
  - Retrieve the corresponding `Event` and fetch the Event Owner's user account details (`userAccountRepository.findById(event.getUserId())`).
  - Check the Event Owner's role tier.
  - If the Event Owner's role is `NORMAL`:
    - Count existing guest invitees for this event: `inviteeRepository.countByEventId(eventId)`.
    - Calculate the projected headcount after adding requested invitees.
    - If the new total exceeds 25, throw a validation exception: `"Normal tier accounts are limited to a maximum of 25 guest invitees per event. Current: %d, Requested: %d."` This guarantees limits are tied to the event ownership tier itself, not the active curator.
* **Event Deletion / Recalculation**: Since event creation limits count active events, hard deleting an event via `deleteEvent` will naturally lower the count back under the 3-event cap for `NORMAL` users.

### 2. Voucher Service and Controllers
* **Voucher Entity & Repository**: Implement `Voucher.java` entity and its JpaRepository `VoucherRepository.java` to manage voucher data.
* **Voucher Generation Endpoint (`POST /api/vouchers/generate`)**:
  - Secure this endpoint so that only users with the `ADMIN` role can access it.
  - Expects a payload containing quantity and an optional `expiresAt` timestamp.
  - Generates secure random alphanumeric codes (e.g. `PLANOHI-PREM-XXXX-XXXX`), saves them to the DB, and returns the list of codes.
* **Voucher Activation Endpoint (`POST /api/vouchers/activate`)**:
  - Secure this endpoint so that any authenticated user can access it.
  - Expects a JSON payload containing `{ "code": "PLANOHI-PREM-XXXX-XXXX" }`.
  - Runs in a transaction with database lock protection (concurrency guard) to prevent double activation:
    - Queries the database for the voucher using a select-for-update lock or checks atomically.
    - Validates the code: Must exist, must not have been activated (`activated_by_user_id` is null), and must not be expired (`expires_at` is null or in the future).
  - Updates the voucher: sets `activated_by_user_id` to current user ID and `activated_at` to the current timestamp.
  - Updates the user: sets `role` to `PREMIUM`.
  - Generates and writes a refreshed `AUTH_TOKEN` cookie to response headers carrying the new `PREMIUM` role claim.
  - Logs the event in standard audit logs (`VOUCHER_ACTIVATE`).

---

## 5. Frontend Upgrades (Next.js)

### 1. Sidebar / Navigation tier checks
- Inspect decoded JWT claims on the server side (`layout.tsx`) and client side to dynamically display tier badges next to user names (e.g. `Premium` or `Admin`).
- For `NORMAL` users, display a visual status prompt (e.g., `3 of 3 events created - Upgrade to Premium`) on the dashboard event creation buttons.
- If a user with the `ADMIN` role logs in, they are redirected to the standard `/events` dashboard as per normal users. However, a glowing "Go to Admin" navigation button is displayed in the global `Navbar` next to the profile menu to allow seamless routing to the admin dashboard.

### 2. Activate Voucher Page (`/activate-voucher`)
- Implement a dedicated glassmorphic page `/activate-voucher` containing a secure input field with verification error mapping (bad request, expired code, already used code) and a success banner upon successful validation.
- Redirect users automatically to `/events` on successful voucher activation.
- Hide/exempt this page from users who are already `PREMIUM` or `ADMIN`.


### 3. Admin Voucher Dashboard (`/admin/vouchers`)
- Implement a dashboard accessible strictly to `ADMIN` users.
- Features a "Generate Vouchers" panel containing quantity inputs and an expiration date picker.
- Displays a lists of generated codes, indicating whether they have been activated, who activated them, and expiration status.

---

## 6. Verification Plan

### Automated Testing
* **Tier Limits Tests**: Unit test `EventServiceImpl` and `InviteeServiceImpl` to verify quota limits are correctly enforced for `NORMAL` users and ignored for `PREMIUM`/`ADMIN` users.
* **Voucher Logic Tests**: Unit test `VoucherService` validating successful voucher generation, activation lifecycle, expiration checks, and double-activation prevention.
* **Controller Access Tests**: Verify that `/api/vouchers/generate` responds with `403 Forbidden` if called by `NORMAL` or `PREMIUM` users, and allows access to `ADMIN` users.

### Manual Verification
* Execute the direct SQL database patch to promote a test account to `ADMIN`.
* Log in as `ADMIN` and generate multiple voucher codes.
* Log in as a `NORMAL` user, attempt to create a 4th event, and assert that the request fails with the tier limit validation message.
* Submit a valid voucher code on the `/activate-voucher` page, verify that the account upgrades to `PREMIUM` instantly, and verify that the 4th event can now be created without errors.
