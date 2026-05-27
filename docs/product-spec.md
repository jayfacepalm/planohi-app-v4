# Planohi Event Planner App Specification

Planohi (Bisaya word for "To Plan") is a comprehensive, self-contained event coordination platform that enables organizers to map out, budget, timeline, and track guest RSVPs.

---

## 1. Core Feature Set

### 🔑 Authentication & Security
* **User Accounts**: Self-registration and login using Email and Password, with a display Alias.
* **JWT Cookie Authentication**: Backend generates a JSON Web Token on successful login and stores it in secure, `HttpOnly`, `SameSite=Strict` cookies. The Next.js frontend routes/proxies request headers automatically.

### 📅 Event Management
* **Event Profiles**: Fields include:
  - Title
  - Description
  - Date Configuration (Single date selector or Date Range Agoda-style picker)
  - Banner image asset url
* **Budget Tracking (EventComponents)**:
  - Events are broken down into components: Venue, Transportation, Organizer, Coordinators, etc.
  - Each component carries an **Estimated Cost**.
  - Total Estimated Cost of the event = Sum of all component estimated costs.
* **Spending Registry**:
  - Individual cash/credit outflows (Spendings) are logged and tagged to specific `EventComponents`.
  - Actual expenditure totals are aggregated and compared against the estimated cost of each component.

### ⏱️ Event Timeline
* **Task Tracker**: Chronological list of event milestones or checklists.
* **Completion State**: Organizers can toggle milestones as "marked as done" to calculate overall completion percentages in real-time.

### ✉️ Personalized RSVP Link
* **Encrypted Invitations**: Each invitee has a secure, unique URL token (UUID v4 or cryptographic hash).
* **Invitee Page**: Public, login-free page showing the invitee's name, event details, and RSVP decision (Accept / Decline).
* **Guest Limit Controls**:
  - Planner configures the `No of allowed guests` per invitee.
  - Upon accepting, the invitee inputs how many additional guests they are bringing (must be <= allowed limit).
  - Real-time guest list count update.

---

## 2. Proposed Database Schema Model (PostgreSQL)

```mermaid
erDiagram
    USER_ACCOUNT {
        uuid id PK
        varchar email UK
        varchar alias
        varchar password_hash
        timestamp created_at
        timestamp updated_at
        varchar created_by
        varchar updated_by
    }
    EVENT {
        uuid id PK
        uuid user_id FK
        varchar title
        text description
        timestamp start_date
        timestamp end_date
        varchar banner_url
        timestamp created_at
        timestamp updated_at
        varchar created_by
        varchar updated_by
    }
    EVENT_COMPONENT {
        uuid id PK
        uuid event_id FK
        varchar name
        numeric estimated_cost
        timestamp created_at
        timestamp updated_at
        varchar created_by
        varchar updated_by
    }
    EVENT_SPENDING {
        uuid id PK
        uuid component_id FK
        varchar description
        numeric amount
        timestamp spent_at
        timestamp created_at
        timestamp updated_at
        varchar created_by
        varchar updated_by
    }
    TIMELINE_ITEM {
        uuid id PK
        uuid event_id FK
        varchar title
        timestamp due_at
        boolean is_done
        timestamp created_at
        timestamp updated_at
        varchar created_by
        varchar updated_by
    }
    INVITEE {
        uuid id PK
        uuid event_id FK
        varchar name
        varchar token UK
        integer allowed_guests
        integer attending_guests
        varchar status
        timestamp responded_at
        timestamp created_at
        timestamp updated_at
        varchar created_by
        varchar updated_by
    }

    USER_ACCOUNT ||--o{ EVENT : creates
    EVENT ||--o{ EVENT_COMPONENT : "broken down into"
    EVENT_COMPONENT ||--o{ EVENT_SPENDING : tracks
    EVENT ||--o{ TIMELINE_ITEM : schedules
    EVENT ||--o{ INVITEE : invites
```
