# Sprint 7: User Alias Dropdown & Email Notifications Microservice

This sprint implements a user profile dropdown menu in the navigation header displaying the logged-in user's decoded alias, and sets up a Spring Boot email notification microservice that processes emails asynchronously via a RabbitMQ broker, resolving database-stored templates and routing them to a local Maildev SMTP container.

---

## 1. Goal

1. **User Alias Dropdown**: Decode the HttpOnly session token `AUTH_TOKEN` on the server-side, extract the user's display alias, and pass it to the frontend. Replace the default login buttons with a premium glassmorphic dropdown menu showing the active user profile and logout controls.
2. **RabbitMQ Message Broker**: Configure a RabbitMQ instance in the local development environment using Docker Compose to orchestrate asynchronous email queues.
3. **Email Notification Microservice**: Initialize the `email` Spring Boot service as a standalone microservice that consumes messages from RabbitMQ, queries email templates from database storage, runs placeholder substitutions, and delivers actual SMTP packets to Maildev.
4. **Dev SMTP Capturing (Maildev)**: Add a local SMTP mail server (Maildev) to the docker orchestration to capture all emails during development and view them in a web interface.

---

## 2. User Stories

* **US-7.1 (Navbar Profile Menu)**: As an authenticated workspace user, I want to see my display alias inside a premium dropdown profile menu in the navigation bar actions area, so that I am always aware of which account I am currently logged into, with an accessible dropdown layout containing the Log Out action.
* **US-7.2 (Infrastructure Broker Integration)**: As a system developer, I want a RabbitMQ container integrated into our local development environment (`docker-compose.yml`) with a proper healthcheck to ensure reliable, order-safe broker startup before backend applications attempt connection.
* **US-7.3 (Notification Message Publisher)**: As the main application backend (`api`), when critical events occur (such as registration or curator invitations), I want to compile email metadata and publish a notification request message asynchronously to RabbitMQ without blocking HTTP response threads or database writes.
* **US-7.4 (Email Consumer Microservice)**: As the standalone notification service (`email`), I want to consume AMQP messages from RabbitMQ, retrieve cached email templates, replace `${placeholder}` values using mapped request metadata, deliver SMTP packets to Maildev, and store success/failure records in the database.
* **US-7.5 (Local Webmail Capture)**: As a developer verifying email layouts and templates, I want all SMTP requests routed to a local mock mail server (Maildev), letting me view rendered HTML contents and layout structures in a local web interface.
* **US-7.6 (Registration OTP Email)**: As a new registering user, when requesting registration, I want to receive an email containing the OTP code so that I can submit it to complete my account setup.
* **US-7.7 (Guest RSVP Invitation Email)**: As an event Organizer or Owner, inside the guest list workspace canvas, I want to click a "Send Invite" button next to a guest record to send them an email containing the event details, headcount limits, and a direct clickable public link to submit their RSVP response.

---

## 3. Database Schema & Migrations

To avoid race conditions, schema locks, or out-of-order schema configurations on startup, database schema migrations for the shared `planohidb` database will be centralized within the `api` project's Flyway migrations.

### 1. Table Alterations: `invitee`
To support optional storing of recipient emails on the guest records, the `invitee` table will be updated:
```sql
ALTER TABLE invitee ADD COLUMN email VARCHAR(255);
```

### 2. Table: `email_template`
Stores standard system email templates containing placeholder strings:
```sql
CREATE TABLE email_template (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'INVITATION_RECEIVED', 'PROPOSAL_SUBMITTED'
    subject_template VARCHAR(255) NOT NULL,
    body_template TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### 3. Table: `sent_emails`
Logs sent email metrics, rendered contents, status codes, and error descriptions:
```sql
CREATE TABLE sent_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR(100) NOT NULL REFERENCES email_template(id),
    recipient_tos TEXT NOT NULL, -- Comma-separated list
    recipient_ccs TEXT,
    recipient_bccs TEXT,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL, -- Rendered body with replaced placeholder content
    status VARCHAR(50) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
    error_message TEXT,
    triggered_by VARCHAR(255) NOT NULL, -- Original user UUID or 'SYSTEM'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

---

## 4. Local Infrastructure Configuration (RabbitMQ & Maildev)

The `docker-compose.yml` file will be modified to define RabbitMQ, Maildev, and the new `email` microservice:

1. **RabbitMQ Broker**:
   ```yaml
     rabbitmq:
       image: rabbitmq:3.13-management-alpine
       container_name: planohi-rabbitmq
       ports:
         - "5672:5672"   # AMQP protocol
         - "15672:15672" # Management Dashboard
       volumes:
         - rabbitmq-data:/var/lib/rabbitmq
       networks:
         - app-network
       healthcheck:
         test: ["CMD", "rabbitmq-diagnostics", "-q", "check_running"]
         interval: 10s
         timeout: 5s
         retries: 5
   ```
2. **Maildev SMTP Capture**:
   ```yaml
     maildev:
       image: maildev/maildev:latest
       container_name: planohi-maildev
       ports:
         - "1025:1025" # SMTP server port
         - "1080:1080" # Web UI port
       networks:
         - app-network
   ```
3. **Notification Microservice (`email`)**:
   ```yaml
     email:
       build:
         context: ./email
         dockerfile: Dockerfile
       container_name: planohi-email
       environment:
         SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/${POSTGRES_DB:-planohidb}
         SPRING_DATASOURCE_USERNAME: ${POSTGRES_USER:-planohiuser}
         SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD:-planohipassword}
         SPRING_RABBITMQ_HOST: rabbitmq
         SPRING_RABBITMQ_PORT: 5672
         SPRING_MAIL_HOST: maildev
         SPRING_MAIL_PORT: 1025
       depends_on:
         db:
           condition: service_healthy
         rabbitmq:
           condition: service_healthy
       networks:
         - app-network
   ```

---

## 5. API Service Integration (Publisher)

* **Dependencies**: Add `spring-boot-starter-amqp` to the `api` POM.
* **AMQP Config**: Configure `RabbitTemplate` with a Jackson JSON message converter. Declare a Direct exchange (`email.exchange`), Queue (`email.send.queue`), and Binding using routing key `email.send`.
* **Non-Blocking Publishing**:
  Email publish commands will be sent using a unified publisher service:
  ```java
  public class EmailMessageDto {
      private String templateId;
      private List<String> recipientTos;
      private List<String> recipientCcs;
      private List<String> recipientBccs;
      private Map<String, Object> metadata; // Key-value placeholders
      private String userId;
  }
  ```
  Wrap RabbitMQ publication calls inside try-catch blocks. If RabbitMQ is unavailable, log a warning rather than throwing an exception, isolating business flows from messaging failures.

---

## 6. Email Service Integration (Consumer)

* **Dependencies**: Configure the `email` project POM to import `spring-boot-starter-amqp`, `spring-boot-starter-mail`, `spring-boot-starter-data-jpa`, and `postgresql`.
* **Spring Configuration**: Set `spring.flyway.enabled: false` and `spring.jpa.hibernate.ddl-auto: validate` so that the microservice verifies tables on startup without competing for database schema locks.
* **AMQP Listener**: Consume payloads from `email.send.queue` using `@RabbitListener`.
* **Caching**: Cache email template lookups under the `"email_templates"` namespace in Redis, invalidating entries if templates are updated.
* **Template Processing**: Parse body and subject text replacing `${placeholder}` keys with matching values from the JSON metadata map:
  - If a template requires `${recipientName}` and metadata has `"recipientName": "John Doe"`, it yields `"John Doe"`.
* **SMTP Delivery**: Route fully resolved messages to JavaMailSender. Log results in `sent_emails` table with `SUCCESS`/`FAILED` status tags.

---

## 7. Email Template Layouts (HTML/CSS)

These templates are coded with inline CSS styles for cross-compatibility with mail clients, using deep dark colors and neon-cyan/neon-purple visual accents to match the platform's cyberpunk aesthetic.

### 1. Template ID: `REGISTRATION_OTP`
**Subject**: `Verify your PLANO.HI Account`
**Placeholder Variable**: `${otpCode}`
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify your PLANO.HI Account</title>
</head>
<body style="margin:0;padding:0;background-color:#070708;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
  <div style="max-width:600px;margin:40px auto;padding:32px;background-color:#0d0d11;border:1px solid #1f1f29;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:24px;font-weight:bold;letter-spacing:2px;background:linear-gradient(90deg,#9333ea,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">PLANO.HI</span>
    </div>
    <h2 style="font-size:20px;font-weight:600;margin-top:0;margin-bottom:16px;color:#ffffff;text-align:center;">Security Verification</h2>
    <p style="font-size:15px;line-height:24px;color:#a1a1aa;margin-bottom:24px;text-align:center;">
      Thank you for registering an account on PLANO.HI. Use the following One-Time Password (OTP) to verify your email and complete your registration:
    </p>
    <div style="margin:32px 0;text-align:center;">
      <div style="display:inline-block;padding:16px 32px;background-color:#161622;border:1px solid #06b6d4;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:6px;color:#06b6d4;box-shadow:0 0 15px rgba(6,182,212,0.15);">
        ${otpCode}
      </div>
    </div>
    <p style="font-size:13px;line-height:20px;color:#71717a;margin-bottom:0;text-align:center;">
      This OTP is valid for <strong>5 minutes</strong>. If you did not request this verification, please ignore this email.
    </p>
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1a1a24;text-align:center;font-size:12px;color:#52525b;">
      &copy; 2026 PLANO.HI. Dynamic Event Management Canvas. All rights reserved.
    </div>
  </div>
</body>
</html>
```

### 2. Template ID: `GUEST_INVITATION`
**Subject**: `You are invited: ${eventName}!`
**Placeholder Variables**: `${inviteeName}`, `${eventName}`, `${allowedGuests}`, `${rsvpLink}`
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Event Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#070708;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
  <div style="max-width:600px;margin:40px auto;background-color:#0d0d11;border:1px solid #1f1f29;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
    <div style="padding:32px;">
      <div style="margin-bottom:24px;">
        <span style="font-size:12px;font-weight:bold;letter-spacing:1px;color:#9333ea;text-transform:uppercase;">Event Invitation</span>
        <h1 style="font-size:24px;font-weight:bold;margin-top:8px;margin-bottom:0;color:#ffffff;">${eventName}</h1>
      </div>
      
      <p style="font-size:15px;line-height:24px;color:#a1a1aa;margin-top:0;margin-bottom:20px;">
        Hello <strong>${inviteeName}</strong>,
      </p>
      <p style="font-size:15px;line-height:24px;color:#a1a1aa;margin-bottom:24px;">
        You have been invited to attend the event <strong>${eventName}</strong>. As our special guest, you are eligible to bring a party of up to <strong>${allowedGuests}</strong> guests (including yourself).
      </p>
      
      <!-- Call to Action RSVP Button -->
      <div style="margin:32px 0;text-align:center;">
        <a href="${rsvpLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(90deg,#9333ea,#06b6d4);color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:8px;box-shadow:0 4px 15px rgba(147,51,234,0.3);">
          Submit RSVP Response
        </a>
      </div>
      
      <p style="font-size:13px;line-height:20px;color:#71717a;margin-bottom:0;text-align:center;background-color:#161622;padding:12px;border-radius:6px;border:1px solid #1f1f29;">
        Please click the button above to confirm your attendance and register headcount.
      </p>
      
      <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1a1a24;text-align:center;font-size:12px;color:#52525b;">
        &copy; 2026 PLANO.HI. Dynamic Event Management Canvas. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
```

---

## 8. Frontend Upgrades

### 1. Token Decoding & Layout Integration
Next.js Layout components are server-rendered. The `layout.tsx` wrapper inside `/events` will:
1. Parse the HttpOnly `AUTH_TOKEN` session cookie.
2. Decode the claims payload manually in Node.js:
   ```typescript
   const payload = token.split('.')[1];
   const claims = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
   const alias = claims.alias;
   ```
3. Inject the decoded `alias` into the layout's `<Navbar userAlias={alias} />` render call.

### 2. Profile Dropdown Menu Component
Inside [Navbar.tsx](file:///c:/Users/jayma/Documents/GitRepo-1/planohi-app-v4/web/components/ui/Navbar.tsx):
* Replace standard Sign In/Docs buttons with a glassmorphic user profile card when a `userAlias` is passed.
* Triggering the profile card opens a dropdown menu containing:
  - Header showing profile icon and `"Logged in as: <userAlias>"`.
  - Account actions list.
  - Custom styled "Log Out" item which invokes the cookie eviction and page redirect commands.
* Integrate proper keyboard focus indicators, click-outside-dismiss listeners, and accessible `aria-haspopup`/`aria-expanded` dialog descriptors.

---

## 9. Sprint Critique & Gaps Resolution

To maintain platform stability, performance, and UI visual consistency, the implementation of this sprint will resolve the following gaps:

* **GAP 25 (RabbitMQ Startup Synchronization)**: Add RabbitMQ diagnostics healthchecks to the compose broker configuration and utilize `condition: service_healthy` on dependent containers to prevent service crashes on startup.
* **GAP 26 (Asynchronous Publisher Failure Isolation)**: Wrap AMQP publishing in the `api` service inside robust catch-blocks to log warnings instead of throwing. Missing broker instances will not roll back database transactions or fail HTTP requests.
* **GAP 27 (Single-Source-of-Truth Flyway Migrations)**: All database migrations will be placed in the `api` migrations directory to prevent schema collisions. The `email` service will validate schemas on startup using `validate` metadata settings.
* **GAP 28 (Maildev SMTP Capture)**: Route development email SMTP traffic to a local Maildev mock container to prevent accidental real mail delivery and inspect styling layouts.
* **GAP 29 (Next.js Hydration Safeguard)**: Render the dynamic navbar dropdown components only after component mounting (`mounted` check) to prevent Next.js server-vs-client layout hydration warnings.
