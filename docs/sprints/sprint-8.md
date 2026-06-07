# Sprint 8: Workspace Security Upgrades (CSP & Cryptographic Role Verification)

This sprint enhances the platform's security posture by enforcing a Content Security Policy (CSP) at the middleware layer to prevent Cross-Site Scripting (XSS) and clickjacking attacks, and introducing cryptographically signed user roles in event workspace DTOs to prevent role tampering on the client.

---

## 1. Goal

1. **Content Security Policy (CSP)**: Configure the Next.js request middleware (`web/proxy.ts`) to return strict CSP headers to protect users from malicious scripts, stylesheets, and frame injections.
2. **Cryptographic Role Signing**: Replace the raw `EventCuratorRole` enum in `EventDto` with a cryptographically signed JWT role token (24-hour TTL matching the session token) containing the `userId`, `eventId`, and `userRole` claims.
3. **Frontend Role Token Decoding**: Update the Next.js pages and workspace canvases to base64-decode the signed role token client-side and extract the active curator role before verifying view permissions.
4. **Backend Role Token Verification**: Require the client to pass the signed role token in a custom HTTP header (`X-Event-Role-Token`) on all state-changing operations, validating the signature and checking permissions in the service layer (`WorkspaceSecurityService`).

---

## 2. User Stories

* **US-8.1 (Content Security Policy)**: As a security-conscious platform user, I want the web application to enforce a Content Security Policy via HTTP headers, so that my browser blocks unauthorized script execution, resource loading, and clickjacking attempts.
* **US-8.2 (Signed Curator Role Token)**: As an event owner, I want my curators' roles to be cryptographically signed by the backend when fetching event details, so that malicious actors cannot escalate their access rights by intercepting and modifying the JSON payload in their browser.
* **US-8.3 (Frontend Token Decoding & Integration)**: As a developer, I want the frontend workspace canvases to decode the backend's signed role token to display appropriate action controls (e.g., hiding edit buttons for VIEWER role) without relying on plain text API parameters.
* **US-8.4 (Backend Role Token Validation)**: As an administrator, when a client attempts to modify event data (budgets, timelines, guests, spendings, or curators), I want the backend to extract and validate the signed role token from the `X-Event-Role-Token` header, ensuring that the token's claims match the targeted event and that the role allows the action.

---

## 3. Cryptographic & Token Design

### 1. Token Signature & Expiration
* **Algorithm**: HMAC-SHA256.
* **Signing Key**: A separate dedicated secret key configured via `security.jwt.role-secret-key` (environment variable `SECURITY_JWT_ROLE_SECRET_KEY`).
* **Expiration Time (TTL)**: 24 hours (matches the auth token expiration to avoid middle-of-session expiration).

### 2. Claims Payload
The signed role token contains the following claims:
```json
{
  "userId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "eventId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "userRole": "ORGANIZER",
  "iat": 1717500000,
  "exp": 1717586400
}
```

---

## 4. Frontend Upgrades (Next.js)

### 1. CSP Header Injection
In [proxy.ts](/planohi-app-v4/web/proxy.ts), inject the Content-Security-Policy (CSP) header on all outgoing responses. To ensure environment flexibility, the allowed origins are dynamically read from environment variables:
* **Environment Variables**:
  - `CSP_ALLOWED_IMAGE_SOURCES` (Default: `'self' data: http://localhost:4566 http://127.0.0.1:4566`)
  - `CSP_ALLOWED_CONNECT_SOURCES` (Default: `'self' ws: http://localhost:8080 http://localhost:3000`)
* **CSP Directive Template**:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src ${CSP_ALLOWED_IMAGE_SOURCES}; connect-src ${CSP_ALLOWED_CONNECT_SOURCES}; frame-ancestors 'none';
  ```

### 2. Client-Side JWT Decoding
Create a security utility in `web/lib/security.ts` to decode the role token using browser-native APIs:
```typescript
export interface RoleClaims {
  userId: string;
  eventId: string;
  userRole: string;
}

export function decodeRoleToken(token?: string): string | null {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return decoded.userRole;
  } catch (e) {
    console.error("Failed to decode user role token", e);
    return null;
  }
}
```

### 3. Canvas Components Integration
Update [page.tsx](/planohi-app-v4/web/app/events/%5Bid%5D/page.tsx) and the following workspace canvas files to decode the role from `event.userRole` before setting view/edit parameters:
* [EventBudgetCanvas.tsx](/planohi-app-v4/web/components/features/EventBudgetCanvas.tsx)
* [EventCuratorsCanvas.tsx](/planohi-app-v4/web/components/features/EventCuratorsCanvas.tsx)
* [EventGuestCanvas.tsx](/planohi-app-v4/web/components/features/EventGuestCanvas.tsx)
* [EventTimelineCanvas.tsx](/planohi-app-v4/web/components/features/EventTimelineCanvas.tsx)
* [EventWorkspaceHeaderActions.tsx](/planohi-app-v4/web/components/features/EventWorkspaceHeaderActions.tsx)

### 4. API Client Header Interceptor
Modify [api-client.ts](/planohi-app-v4/web/lib/api-client.ts) (or local state) to store the signed role token and automatically append it to the `X-Event-Role-Token` header when making write/mutate requests (`POST`, `PUT`, `DELETE`, `PATCH`).

---

## 5. API Backend Upgrades (Spring Boot)

### 1. EventDto Type Change
Modify `EventDto.java` to represent `userRole` as a signed string token:
```java
public class EventDto {
    private UUID id;
    private UUID userId;
    private String userRole; // Signed JWT token string containing eventId and role claims
    // ...
}
```

### 2. Token Generation & JWT Configuration
* Remove default fallbacks from `@Value` properties in `JwtService.java` for `secretKey`, `jwtExpiration`, and `roleSecretKey`.
* Map these values via `security.jwt` in `application.yaml` dynamically using environment variables:
  - `SECURITY_JWT_SECRET_KEY`
  - `SECURITY_JWT_EXPIRATION_TIME`
  - `SECURITY_JWT_ROLE_SECRET_KEY`
* Add these variables to the workspace root `.env` and `.env.example` files, and pass them to the `api` container in `docker-compose.yml`.
* Add signature helpers in `JwtService.java` to sign and parse the role token.

### 3. Service Layer Validation
Add role verification in `WorkspaceSecurityService.java` and implement it in `WorkspaceSecurityServiceImpl.java`:
```java
void validateRoleToken(String roleToken, UUID eventId, EventCuratorRole requiredMinRole);
```
Inside the implementation:
1. Verify the signature of `roleToken` using the dedicated role secret key.
2. Confirm the token has not expired.
3. Validate that the token's `eventId` matches the target `eventId`.
4. Validate that the token's `userId` matches the currently authenticated user's ID.
5. Validate that the token's `userRole` has write permissions (e.g. is `OWNER` or `ORGANIZER` based on the controller's requirements).
6. If any validation fails, throw an access denied exception.

---

## 6. Verification Plan

### Automated Verification
* Run unit tests on token signature validation in the backend.
* Validate that request mutations containing a tampered or expired role token header are rejected with `403 Forbidden` or `400 Bad Request`.

### Manual Verification
* Inspect network headers in browser DevTools to ensure `Content-Security-Policy` is present on page responses.
* Verify that S3 banner images load correctly under the configured `img-src` directive.
* Verify that curators can modify components/spendings successfully under valid role tokens.

---

## 7. Sprint Critique & Gaps Resolution

* **GAP-1 (Browser Compatibility for Base64 Decoding)**: Next.js Client Components running in the browser cannot use the Node.js global `Buffer` without bundling heavy polyfills. The decoding utility uses standard browser APIs (`atob`) to decode JWT payloads safely and efficiently.
* **GAP-2 (Production CSP Strictness vs. Dev Fast-Refresh)**: The default CSP uses `'unsafe-eval'` and `'unsafe-inline'` for script-src to support Next.js fast-refresh and CSS styling during local development. In production deployments, it is recommended to tighten this policy using script nonces or SHA hashes, and block `'unsafe-inline'` completely.
