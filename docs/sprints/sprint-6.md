# Sprint 6: AWS S3 Cloud Storage & Multiple Event Curator Roles

This sprint enhances event workspace banner storage by migrating from local folder volume storage to AWS S3 (mocked locally using LocalStack) and implements collaborative multi-curator event workspaces. Curator users are assigned event-specific roles (Organizer, Collaborator, Viewer), and any resource modifications made by Collaborators must go through a secure proposal approval workflow reviewed by Organizers.

---

## 1. Goal

1. **S3 Cloud Storage**: Replace the local filesystem storage for event banner uploads with AWS S3 cloud storage. Integrate a LocalStack container in `docker-compose.yml` for automated S3 mocking in the local development environment.
2. **Event Curators & Roles**: Allow multiple curators to be invited to a single event workspace, mapping permissions to three event-specific roles:
   - **Organizer**: Full read-write controls (CRUD), curate membership roles, and approve/reject Collaborator edits. Only the original workspace **Owner** (creator) can delete the entire workspace.
   - **Collaborator**: Can propose creations, updates, and deletions of budget components, spendings, and timeline items. These changes are saved as pending proposals.
   - **Viewer**: Read-only access to all dashboards, timeline items, budget tables, and guest lists.
3. **Change Proposal Workflow**: Create a generic approval routing system where Collaborator edits are saved as serialized JSONB draft states and displayed in a dashboard queue for Organizers to review.
4. **Curator Acceptance Flow**: Integrate a pending invitation queue on the user dashboard, requiring invited curators to explicitly accept workspace invites before gaining viewer/editor privileges.

---

## 2. User Stories

* **US-6.1 (S3 Cloud Storage Migration)**: As a system developer/deployer, I want banner image uploads to be saved directly to an AWS S3 bucket (or mocked LocalStack container) rather than local server directories, retrieving files securely via dynamically generated pre-signed S3 URLs.
* **US-6.2 (Curator Management Dashboard)**: As an event Organizer, I want to manage curators by email search, assigning them the role of `Collaborator` or `Viewer`, and revoking their access if necessary. Invited curators will start as `PENDING` and must accept access.
* **US-6.3 (Collaborator Action Drafting)**: As an event Collaborator, when I add, edit, or delete event budget components, spending entries, or timeline milestones, my changes must not modify the live workspace data immediately. Instead, they should be queued as "Pending Approval" changes.
* **US-6.4 (Organizer Approvals Queue)**: As an event Organizer, I want to see an "Approvals" dashboard tab displaying all pending change proposals submitted by Collaborators, with options to approve (instantly committing the edits) or reject (discarding the proposal) them.
* **US-6.5 (Invitation Acceptance Banner)**: As an invited curator (Collaborator/Viewer), I want to see a banner notification of pending workspace invitations on my home events dashboard and be able to accept or decline the invitation.

---

## 3. Database Schema & Migrations

To support membership mapping and change logs, two new tables will be added via Flyway migrations:

### 1. Table: `event_curator`
Stores event members, their status (invitation flow), and role assignments:
```sql
CREATE TABLE event_curator (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ORGANIZER', 'COLLABORATOR', 'VIEWER')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_by VARCHAR(255) NOT NULL,
    UNIQUE (event_id, user_id)
);
CREATE INDEX idx_event_curator_event ON event_curator(event_id);
CREATE INDEX idx_event_curator_user ON event_curator(user_id);
```

### 2. Table: `change_proposal`
Stores serialized draft states in PostgreSQL `JSONB` format for Collaborator change requests:
```sql
CREATE TABLE change_proposal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    proposed_by UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    target_type VARCHAR(100) NOT NULL CHECK (target_type IN ('COMPONENT', 'SPENDING', 'TIMELINE_ITEM')),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE')),
    target_id UUID, -- NULL for CREATE actions
    proposed_data JSONB, -- JSONB type replaces TEXT for query safety and structured properties
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES user_account(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_by VARCHAR(255) NOT NULL
);
CREATE INDEX idx_change_proposal_event_status ON change_proposal(event_id, status);
```

---

## 4. Local Infrastructure Configuration (LocalStack)

To mock S3 bucket operations locally without hitting real AWS servers, the `docker-compose.yml` will be updated:

1. **Add `localstack` Service**:
   ```yaml
     localstack:
       image: localstack/localstack:latest
       container_name: planohi-localstack
       ports:
         - "4566:4566"
       environment:
         - SERVICES=s3
         - AWS_DEFAULT_REGION=ap-northeast-1
       volumes:
         - ./infra/localstack:/etc/localstack/init/ready.d
         - localstack-data:/var/lib/localstack
       networks:
         - app-network
   ```
2. **Initialization Script**:
   Create `./infra/localstack/init-s3.sh`:
   ```bash
   #!/bin/sh
   awslocal s3 mb s3://planohi-banners
   ```
3. **Update `api` Service configuration**:
   Add dependencies on `localstack` and feed configuration variables:
   ```yaml
       environment:
         ...
         AWS_S3_BUCKET_NAME: planohi-banners
         AWS_S3_ENDPOINT: http://localstack:4566
         AWS_ACCESS_KEY_ID: mockkey
         AWS_SECRET_ACCESS_KEY: mocksecret
         AWS_REGION: ap-northeast-1
       depends_on:
         db:
           condition: service_healthy
         cache:
           condition: service_healthy
         localstack:
           condition: service_started
   ```

---

## 5. Backend REST APIs & Security Rules

### 1. AWS S3 Integration
* **Service**: `S3StorageService` (using AWS Java SDK v2) to upload files and generate pre-signed S3 download URLs.
* **Pre-signed URLs**: Modify `EventDto` mapping to generate a secure pre-signed GET URL for the banner image valid for 15 minutes. This completely offloads file streaming from the application server.
* **LocalStack Endpoint Override**: Configure AWS S3 builder in Java to set `.endpointOverride()` to LocalStack's endpoint and enable path-style access mapping `.pathStyleAccessEnabled(true)` for local profile targets.

### 2. Curator Management Endpoints
Access restricted to Event Owner (`event.userId = authenticatedUser`) or curators with `role = ORGANIZER` and `status = ACCEPTED`.

* **Invite Curator**: `POST /api/events/{eventId}/curators`
  - Body: `{ "email": "curator@example.com", "role": "COLLABORATOR" | "VIEWER" }`
  - Validation: Verifies that the email belongs to a registered user and they are not already members/owners. Inserts curator with status `PENDING`.
* **List Curators**: `GET /api/events/{eventId}/curators`
  - Returns members list with names, emails, roles, and invitation status.
* **Modify Curator Role**: `PUT /api/events/{eventId}/curators/{curatorId}`
  - Body: `{ "role": "ORGANIZER" | "COLLABORATOR" | "VIEWER" }`
  - Owner cannot modify their own status. Only the Owner can grant `ORGANIZER` status.
* **Remove Curator**: `DELETE /api/events/{eventId}/curators/{curatorId}`
* **Active User Invitations Queue**: `GET /api/curators/invitations`
  - Returns active pending invitations (`status = PENDING`) mapped to the authenticated user.
* **Respond to Invitation**: `POST /api/curators/invitations/{curatorId}/respond`
  - Body: `{ "action": "ACCEPT" | "DECLINE" }`
  - Action `ACCEPT` changes status to `ACCEPTED`; action `DECLINE` deletes the curator row.

### 3. Change Proposal Management Endpoints
* **Collaborator Actions Routing**:
  When a user with `role = COLLABORATOR` calls write endpoints (e.g. `POST /api/events/{eventId}/components`, `PUT /api/components/...`, `DELETE /timeline/...`):
  - Instead of modifying tables directly, the request is intercepted inside the service layer.
  - A `ChangeProposal` is logged as `PENDING`, and the endpoint returns a `202 Accepted` response.
* **List Pending Proposals**: `GET /api/events/{eventId}/proposals?status=PENDING` (Organizer/Owner only)
* **Approve/Reject Proposal**: `POST /api/proposals/{proposalId}/review`
  - Body: `{ "action": "APPROVE" | "REJECT" }`
  - Behavior on `APPROVE`:
    - Deserializes the proposed properties.
    - Executes the corresponding target entity creation, update, or deletion.
    - **Proposer Audit Override**: Bypasses the default Spring AuditorAware context on saving to manually assign the Collaborator's name (the proposer) to the `createdBy` audit metadata fields on the target record.
    - Updates proposal status to `APPROVED`.
  - Behavior on `REJECT`:
    - Updates proposal status to `REJECTED`.

---

## 6. Frontend Layout & Canvas Upgrades

### 1. Home Events Dashboard Invitations Banner
* Displays a cyberpunk animated list card showing pending invitations if the authenticated user has pending invitations:

### 2. New Event Details Tabs
* **Curators Tab**:
  - Displays a grid/list of active curators with their roles.
  - Input field to invite new curators by email (validated on submission).
  - Role change selectors and "Revoke Access" action buttons.
* **Approvals Tab** (Hidden for collaborators/viewers):
  - Lists pending proposals submitted by curators.
  - Shows clear details (e.g., *“John Doe proposed logging a spending of $500 for Component 'Catering'”*).
  - Clickable "Approve" (success color) and "Reject" (danger color) controls.

### 3. State & Badges UI Indicators
* **Pending Badges**: Any budget category, spending entry, or milestone created or updated by a Collaborator that is still awaiting review should be rendered in the main panels with a semi-opaque warning state, accompanied by a subtle "Awaiting Approval" lock badge.
* **Read-only Lockout**: Disable delete, log spending, and drag-and-drop actions on UI canvases if the authenticated user has a `VIEWER` role or is not yet accepted.

---

## 7. Caching & Cache Invalidation

* **Caching Scope**: Evict list/metrics and component summaries upon proposal approval.
* **Proposal Cache Namespace**: Cache pending proposals list under namespace `"event_proposals"` with key: `eventId`. Evict upon creation (creation of a proposal by Collaborator) or review (approval/rejection by Organizer).

---

## 8. Sprint Critique & Gaps Resolution

To maintain platform stability, performance, and UI visual consistency, the implementation of this sprint will resolve the following gaps:

* **GAP 20 (JSONB Storage Migration)**: Replace the generic `proposed_data` `TEXT` serialization column with a native PostgreSQL `JSONB` data type mapping, and configure Hibernate's `@JdbcTypeCode(SqlTypes.JSON)` mapping to parse properties directly without manual Jackson mapper string conversions.
* **GAP 21 (Granular Security Checks Refactoring)**: Refactor the 20+ hardcoded workspace ownership assertions `if (!event.getUserId().equals(userId))` across services to call a common security checker `WorkspaceSecurityService`. This dynamically validates if the active requester is the owner OR has an accepted curator role, blocking unauthorized edits, and routing Collaborator writes to the change proposal engine.
* **GAP 22 (Curator Acceptance State)**: Rather than adding curators immediately, configure a pending invitation queue on the user dashboard. Users must accept workspace access before the workspace is added to their events feed or authorized by the security checker.
* **GAP 23 (Mock S3 Builder Override)**: Provide Java S3 SDK configurations to specify endpoint overrides `.endpointOverride(URI.create(s3Endpoint))` and enable path-style access mapping `.pathStyleAccessEnabled(true)` under the local development profile.
* **GAP 24 (Manual Audit Override on Proposals)**: Manually assign the Collaborator's name as the creator on target database records when approving proposals, preventing default Spring JPA auditing from marking the Organizer (approver) as the creator of the record.
