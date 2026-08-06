# Sprint 16: Milestone Discussion & Comments System

This sprint introduces a unified collaborative discussion and comment system to the event workspace canvas. Using a flexible, single-table comment architecture (`workspace_comment`), event owners, organizers, and collaborators can post and delete comments on individual milestones, while read-only viewers can view discussion threads without submitting comments.

---

## 1. Goals

1. **Unified Workspace Comment Data Model**: Create a Flyway database migration establishing a common `workspace_comment` table parameterized by `target_type` (`TIMELINE`, `SPENDING`, etc.) and `target_id`. This avoids database table sprawl when extending comments to other workspace modules.
2. **4-Tier Backend Architecture & Redis Caching**: Implement `WorkspaceCommentController`, `WorkspaceCommentCachedService` (with Redis caching and eviction rules), `WorkspaceCommentService`/`ServiceImpl`, and `WorkspaceCommentRepository`.
3. **Role-Based Comment Authorization & Role Token Validation**: Enforce security rules using `WorkspaceSecurityService.validateRoleToken`. Users with `OWNER`, `ORGANIZER`, or `COLLABORATOR` roles (`canComment`, minimum role `COLLABORATOR`) can post and delete comments; users with the `VIEWER` role can read discussion threads but cannot submit new comments.
4. **Activity Logging**: Publish background activity events via `ActivityLogPublisher` on comment creation and deletion (`action = "WORKSPACE_COMMENT_ADD"`, `action = "WORKSPACE_COMMENT_DELETE"`).
5. **Interactive Timeline UI Integration**: Update [EventTimelineCanvas.tsx](/planohi-app-v4/web/components/features/EventTimelineCanvas.tsx) with a discussion drawer/modal interface to display comment counts, loading skeletons, timestamped author badges, and real-time comment creation for milestones (`target_type = "TIMELINE"`).

---

## 2. User Stories

* **US-16.1 (View Milestone Discussion Thread)**: As an event workspace member or viewer, I want to click on a timeline milestone to expand its discussion thread so that I can read comments posted by team members.
* **US-16.2 (Post Milestone Comment)**: As an event owner, organizer, or collaborator, I want to type a text comment and submit it to a milestone so that I can coordinate tasks and share updates with team members.
* **US-16.3 (Viewer Read-Only Guard)**: As a viewer accessing an event workspace, I want to read milestone comments while having submission inputs hidden so that read-only access boundaries are maintained.
* **US-16.4 (Delete Milestone Comment)**: As a comment author or workspace organizer, I want to delete my own comments or moderate discussions on a milestone.

---

## 3. Database Schema & Migration

> [!IMPORTANT]
> **Unified Workspace Comment Schema Architecture**
> Rather than creating fragmented, feature-specific comment tables (e.g. `timeline_item_comment`, `event_spending_comment`), Sprint 16 introduces a single `workspace_comment` table. It uses `target_type` (`TIMELINE`, `SPENDING`) and `target_id` (UUID of the timeline item or spending entry). For Sprint 16, implementation focuses on `target_type = 'TIMELINE'`.

### Migration File: `V20260710000100__create_workspace_comment_table.sql`

```sql
CREATE TABLE workspace_comment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- e.g. 'TIMELINE', 'SPENDING'
    target_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    author_alias VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE INDEX idx_workspace_comment_target ON workspace_comment(target_type, target_id);
CREATE INDEX idx_workspace_comment_event ON workspace_comment(event_id);
CREATE INDEX idx_workspace_comment_user ON workspace_comment(user_id);
```

### JPA Entity: `WorkspaceComment.java`
* Extends `BaseAuditEntity` for automated `createdAt`, `updatedAt`, `createdBy`, and `updatedBy` tracking.
* Uses Hibernate 6 time-ordered UUID v7 primary key generation:
  ```java
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  @Column(name = "id", updatable = false, nullable = false)
  private UUID id;
  ```

---

## 4. Backend REST APIs & Caching Layer

### 1. Redis Cache Configuration (`CacheConfig.java`)
Add the `"workspace_comments"` cache configuration to [CacheConfig.java](/planohi-app-v4/api/src/main/java/com/planohi/api/config/CacheConfig.java):
```java
RedisCacheConfiguration commentsCacheConfig = RedisCacheConfiguration.defaultCacheConfig()
    .entryTtl(Duration.ofMinutes(15))
    .disableCachingNullValues();
```

### 2. Cached Service Layer (`WorkspaceCommentCachedService.java`)
* **`getComments`**: `@Cacheable(value = "workspace_comments", key = "#eventId.toString() + ':' + #targetType + ':' + #targetId.toString()")`
* **`createComment`**: `@CacheEvict(value = "workspace_comments", key = "#eventId.toString() + ':' + #targetType + ':' + #targetId.toString()")`
* **`deleteComment`**: `@CacheEvict(value = "workspace_comments", allEntries = true)`

---

### 3. REST Endpoints Specifications

#### Endpoint 1: Get Comments for Target Entity
* **URI**: `GET /api/events/{eventId}/comments`
* **Headers**: `X-Event-Role-Token` (optional)
* **Query Params**: `targetType` (string, required, e.g. `"TIMELINE"`), `targetId` (UUID, required)
* **Security**: `workspaceSecurityService.checkReadAccess(userId, eventId)`
* **Response**: `200 OK`
  ```json
  {
    "status": "SUCCESS",
    "msg": "Comments retrieved successfully",
    "result": [
      {
        "id": "018e5a6f-7b2c-7000-8111-222333444555",
        "eventId": "018e5a6f-0000-7000-8111-111111111111",
        "targetType": "TIMELINE",
        "targetId": "018e5a6f-1111-7000-8111-999999999999",
        "userId": "018e5a6f-2222-7000-8111-888888888888",
        "authorAlias": "Alex Organizer",
        "content": "Vendor deposit confirmed for venue setup.",
        "createdAt": "2026-07-10T14:30:00Z"
      }
    ]
  }
  ```

#### Endpoint 2: Post Comment for Target Entity
* **URI**: `POST /api/events/{eventId}/comments`
* **Headers**: `X-Event-Role-Token: <roleToken>`
* **Security**: `workspaceSecurityService.validateRoleToken(roleToken, userId, eventId, EventCuratorRole.COLLABORATOR)`. Users with role `VIEWER` receive HTTP `403 Forbidden`.
* **Request Payload**:
  ```json
  {
    "targetType": "TIMELINE",
    "targetId": "018e5a6f-1111-7000-8111-999999999999",
    "content": "Please verify sound system requirements before Friday."
  }
  ```
* **Behavior**:
  - Validates `@NotBlank` and `@Size(max = 1000)` on `content`.
  - Verifies minimum role `COLLABORATOR`.
  - Persists record into `workspace_comment`.
  - Evicts Redis cache for `"workspace_comments"`.
  - Publishes activity log: `activityLogPublisher.publish(userId, userAlias, "WORKSPACE_COMMENT_ADD", "TIMELINE_ITEM_COMMENT", commentId, eventId, "SUCCESS", Map.of("targetType", "TIMELINE", "targetId", targetId))`.
* **Response**: `201 Created`

#### Endpoint 3: Delete Comment
* **URI**: `DELETE /api/events/{eventId}/comments/{commentId}`
* **Headers**: `X-Event-Role-Token: <roleToken>`
* **Security**: Requires user to be the comment author (`user_id == callerUserId`) or hold workspace role `OWNER` or `ORGANIZER`.
* **Behavior**: Deletes record, evicts cache, publishes `WORKSPACE_COMMENT_DELETE` activity log.
* **Response**: `200 OK`

---

## 5. Technical Implementation Details

### 1. Frontend Role Check & Role Token Initialization in [EventTimelineCanvas.tsx](/planohi-app-v4/web/components/features/EventTimelineCanvas.tsx)

Update `EventTimelineCanvas.tsx` to derive permission flags and pass role tokens to API calls:

```typescript
useEffect(() => {
  if (userRole) {
    setRoleToken(userRole);
  }
}, [userRole]);

const decodedRole = decodeRoleToken(userRole);
const canEdit = decodedRole === USER_ROLES.OWNER || decodedRole === USER_ROLES.ORGANIZER || decodedRole === USER_ROLES.COLLABORATOR;

// Everyone EXCEPT VIEWER can add comments (Minimum role: COLLABORATOR)
const canComment = decodedRole !== USER_ROLES.VIEWER && decodedRole !== null;
```

### 2. Milestone Discussion Component (`MilestoneCommentsModal.tsx` or Inline Drawer)

* **Comment Count Indicator**: Add a discussion button on each timeline milestone item displaying a `MessageSquare` icon and comment count badge.
* **Modal / Drawer State**:
  - Clicking the milestone discussion trigger loads comments via `fetchApi<WorkspaceCommentDto[]>(`/events/${eventId}/comments?targetType=TIMELINE&targetId=${item.id}`)`.
  - Display skeleton loaders (`Skeleton.tsx`) while loading comments.
  - Display empty state if comment list is empty ("No discussion comments on this milestone yet").
  - **Conditional Input Render**:
    ```tsx
    {canComment ? (
      <form onSubmit={handlePostComment} className="flex gap-2 mt-4">
        <Input
          placeholder="Add a comment to this milestone..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          disabled={submitting}
        />
        <Button type="submit" variant="primary" isLoading={submitting}>
          Post
        </Button>
      </form>
    ) : (
      <p className="text-xs text-zinc-500 italic mt-4">
        Viewers have read-only access and cannot post comments.
      </p>
    )}
    ```

---

## 6. Verification Plan

### Automated Build & Test Verification
1. **Backend Unit & Integration Tests**: Run `mvn test` in `/api` to verify `WorkspaceCommentServiceTest`, Redis cache eviction, activity log publishing, and `VIEWER` 403 Forbidden security authorization checks.
2. **Frontend Compiler Check**: Run `npm run build` inside `/web` to verify TypeScript compilation of `EventTimelineCanvas.tsx` and comment DTO models.

### Manual Behavior Tests
1. **Post Comment as Collaborator/Organizer**: Log in as a Collaborator or Organizer, open a milestone discussion modal, type a comment, and press Post. Verify comment appears immediately and activity log is generated.
2. **Read-Only Viewer Test**: Log in as a `VIEWER`. Open the milestone comment thread. Verify existing comments are displayed, but the input text field and post button are replaced with the read-only notice.
3. **Delete Comment Test**: Log in as comment author or Organizer, click delete on a comment, verify comment is removed and cache is evicted.
