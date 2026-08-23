# Sprint 19: Streamline Event Caching & Fix Stale Stakeholder Data

This sprint focuses on resolving a critical production issue where concurrent edits made by an Organizer (such as adding a milestone) are not immediately visible to the Event Owner or other stakeholders. The goal is to refactor our Redis caching strategy to invalidate caches event-wide rather than strictly user-wide, streamlining caching logic for timelines, event details, components, and budgets.

---

## 1. Goals

1. **Resolve Stale Cache Issue**: Ensure that when any authorized stakeholder (e.g., Organizer) updates event details, milestones, components, or budgets, the cache is immediately invalidated for the Owner and all other stakeholders.
2. **Event-Centric Cache Eviction**: Refactor cache eviction logic to delete all user-specific cache entries for a given event, rather than just evicting the cache for the user making the request.
3. **Streamline Caching Infrastructure**: Introduce a robust `RedisTemplate`-based wildcard eviction utility (e.g., `EventCacheInvalidationService`) to handle complex pattern-based evictions that standard Spring `@CacheEvict` cannot natively support.
4. **Audit All Caches**: Review and apply this standard across all event-related caches (`events_detail`, `event_timeline`, `event_budget_summary`, `event_components`, `event_invitees`).

---

## 2. User Stories

* **US-19.1 (Stakeholder Real-Time Visibility)**: As an event Owner, I want to immediately see new milestones or updates added by an Organizer without waiting for the cache TTL to expire, so that I have an accurate real-time view of my event.
* **US-19.2 (Event-Wide Invalidation for Organizers)**: As an event Organizer, I want my modifications to event components and budgets to trigger a global cache invalidation for that specific event, so that all other curators and guests see the most up-to-date data.
* **US-19.3 (Centralized Cache Eviction)**: As a Backend Developer, I want to implement a unified cache invalidation service that can evict keys by an `eventId` wildcard pattern, so that cache management is more scalable and less error-prone than evicting per user or evicting all entries system-wide.

---

## 3. Database Schema & Migration

* **N/A** — This sprint is entirely backend caching logic focused. No backend database tables or migrations are required.

---

## 4. Backend REST APIs

* **N/A** — No new REST endpoints or payload schema changes are introduced. This sprint purely updates the internal caching interceptors and service layers to improve data consistency across existing endpoints (e.g., `GET /api/events/{eventId}`, `GET /api/events/{eventId}/timeline`).

---

## 5. Technical Implementation Details / Frontend Work

### Backend Service Refactoring

* **Decoupling User-Specific State (Global Event Caching)**:
  Instead of caching data per-user (e.g., `key = "#userId.toString() + ':' + #eventId.toString()"`), decouple user-specific state like `userRole` from the cached DTOs (`EventDto`, timeline responses, etc.).
  - Update `@Cacheable` and `@CacheEvict` annotations in `EventCachedService`, `TimelineCachedService`, `EventComponentCachedService`, and `EventSpendingCachedService` to solely use `key = "#eventId.toString()"`.
  - Refactor the underlying service methods (or a fast post-processing step) to dynamically inject the `userRole` and any other user-specific permission flags into the DTO *after* retrieving the core event data from the global cache.
  - **Result**: This completely eliminates the stale data issue since there is only one universal cache entry per event *within each module*. (Note: Caching is inherently separated into Event modules via Spring's `value` attribute, e.g., `value = "event_timeline"`, `value = "event_budget_summary"`. So a timeline cache key is effectively `event_timeline:eventId`). Any write action by **any authorized user** (Organizer, Owner, etc.) will evict this single key using standard `@CacheEvict(key = "#eventId.toString()")`, immediately propagating the module update to all stakeholders.

### Frontend Work

* **N/A** — The frontend will naturally benefit from this backend fix and will correctly receive the latest data on subsequent data fetches or page refreshes.

---

## 6. Verification Plan

### Automated Testing

* Write integration tests utilizing `Testcontainers` (or an embedded Redis) to simulate a multi-stakeholder scenario:
  1. Owner fetches event timeline (Cache miss, writes to Owner's cache).
  2. Organizer fetches event timeline (Cache miss, writes to Organizer's cache).
  3. Organizer adds a new milestone.
  4. Verify that fetching the event timeline as the Owner now results in a cache miss and returns the newly added milestone from the database.
* Commands to run: `mvn clean test -Dtest=TimelineCacheIntegrationTest`

### Manual Verification

1. Log into the application using two different browsers/sessions: one as the Event Owner and one as an Event Organizer.
2. Navigate to the Event Timeline tab on both sessions.
3. As the Organizer, add a new milestone and save it.
4. As the Event Owner, manually refresh the page or trigger a data refetch.
5. **Verify**: The newly created milestone appears immediately without any cache delay.
6. Repeat the above steps for Event Components, Budgets, and updating core Event Details to ensure all caches are behaving as expected.
