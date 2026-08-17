# Planohi Event Planner App Specification

Planohi (Bisaya word for "To Plan") is a comprehensive, self-contained event coordination platform that enables organizers to map out, budget, timeline, and track guest RSVPs.

---

## 1. Core Feature Set (Implemented)

### 🔑 Authentication, Security & Quotas
* **User Tiers**: Accounts are tiered into `NORMAL` (quota limited), `PREMIUM` (unlimited), and `ADMIN` roles. Normal users are limited to 3 events and 25 guests per event.
* **Voucher Activation**: Users can upgrade to Premium instantly using unique voucher codes.
* **Authentication**: Self-registration with Email/OTP, and Google OAuth2 Sign-in/Auto-registration.
* **Security & Tokens**: JWT HttpOnly session cookies. Cryptographically signed role tokens (`X-Event-Role-Token`) prevent privilege escalation.
* **Data Privacy**: Email masking enforces privacy on the UI and logs. Content Security Policy (CSP) protects against XSS.

### 📅 Event Management Workspace
* **Workspaces**: Timezone-aware event profiles (title, description, start/end dates).
* **AWS S3 Banner Storage**: Event banners are uploaded securely to AWS S3.
* **Multi-Currency Support**: Planners can select their preferred currency (e.g. PHP, USD, EUR or custom).
* **AdSense Integration**: Non-premium users see subtle, themed sponsor ads in the workspace. Ad-blocker detection gracefully suggests premium upgrades.

### 👥 Collaboration & Curator Roles
* **Multi-Curator Access**: Invite collaborators to your event.
* **Roles**: OWNER (full control), ORGANIZER (approval rights), COLLABORATOR (propose changes), VIEWER (read-only).
* **Change Proposals**: Edits from Collaborators are queued for Organizer approval before taking effect.
* **Unified Comments**: Real-time discussion thread on timeline milestones.

### 💰 Budgeting & Actual Spendings
* **Event Components**: Planners break down budgets into categories (Venue, Transportation, Catering) with estimated costs.
* **Chronological Spendings**: Actual expenses can be logged against components. Planners can view spendings by component or via a chronological "All Spendings" log.
* **Dynamic Budgeting**: Real-time calculation of Estimated vs. Actual total costs.

### ⏱️ Event Timeline Planner
* **Task Tracker**: Chronological checklist of event milestones and deadlines.
* **Completion State**: Planners toggle milestone status to compute real-time completion progress.

### ✉️ RSVP & Guest Management
* **Secure RSVPs**: Guests access a login-free RSVP page using cryptographically secure unique URL tokens.
* **Party Limits**: Organizers configure max allowed guests per invitee. Guests select their party size when accepting.
* **Bulk Notifications**: Organizers can immediately trigger or schedule Bulk Emails to pending guests via Quartz Scheduler.

### 🛠️ Infrastructure & Auditing
* **Modular Monolith**: High-performance single-task multi-container architecture using Spring Events.
* **AWS Cloud Deployment**: Hosted on AWS ECS Fargate with an Application Load Balancer. Uses Amazon RDS (PostgreSQL), ElastiCache (Redis) for high-performance caching, Amazon SES for email delivery, and AWS Secrets Manager for secure credentials.
* **Activity Audit Logs**: All CUD (Create, Update, Delete) and login actions are persistently logged with JSON details and MDC Correlation IDs for tracing.
* **Social Sharing**: A one-click "Share Plan" generates a clean clipboard summary (Budget & Timeline) for social media distribution.

---

## 2. Database Schema Model (PostgreSQL)

```mermaid
erDiagram
    USER_ACCOUNT {
        uuid id PK
        varchar email UK
        varchar alias
        varchar password_hash
        varchar role
        varchar provider
        timestamp created_at
        timestamp updated_at
    }
    VOUCHER {
        uuid id PK
        varchar code UK
        uuid created_by_user_id FK
        uuid activated_by_user_id FK
        timestamp expires_at
    }
    EVENT {
        uuid id PK
        uuid user_id FK
        varchar title
        text description
        timestamp start_date
        timestamp end_date
        varchar banner_url
        varchar currency
    }
    EVENT_CURATOR {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        varchar role
        varchar status
    }
    CHANGE_PROPOSAL {
        uuid id PK
        uuid event_id FK
        uuid proposed_by FK
        varchar target_type
        varchar action_type
        jsonb proposed_data
        varchar status
    }
    EVENT_COMPONENT {
        uuid id PK
        uuid event_id FK
        varchar name
        numeric estimated_cost
    }
    EVENT_SPENDING {
        uuid id PK
        uuid component_id FK
        varchar description
        numeric amount
        timestamp spent_at
    }
    TIMELINE_ITEM {
        uuid id PK
        uuid event_id FK
        varchar title
        timestamp due_at
        boolean is_done
    }
    WORKSPACE_COMMENT {
        uuid id PK
        uuid event_id FK
        varchar target_type
        uuid target_id
        uuid user_id FK
        text content
    }
    INVITEE {
        uuid id PK
        uuid event_id FK
        varchar name
        varchar email
        varchar token UK
        integer allowed_guests
        integer attending_guests
        varchar status
    }
    ACTIVITY_LOG {
        uuid id PK
        varchar correlation_id
        uuid user_id
        varchar action
        jsonb details
        timestamp timestamp
    }

    USER_ACCOUNT ||--o{ EVENT : owns
    USER_ACCOUNT ||--o{ VOUCHER : generates/activates
    EVENT ||--o{ EVENT_CURATOR : has_members
    EVENT ||--o{ CHANGE_PROPOSAL : requires_approval
    EVENT ||--o{ EVENT_COMPONENT : budget_blocks
    EVENT_COMPONENT ||--o{ EVENT_SPENDING : tracks_expenses
    EVENT ||--o{ TIMELINE_ITEM : schedules_milestones
    EVENT ||--o{ WORKSPACE_COMMENT : discussions
    EVENT ||--o{ INVITEE : invites_guests
```
