---
name: backend-development
description: Guidelines and rules for building/updating the Spring Boot backend, JPA, caching with Redis, and database migrations. Use this when writing Java classes, entities, database queries, and SQL migration files.
---

# Spring Boot Backend Development Skill

Use this skill when developing or modifying the backend code of the Spring Boot application.

## Core Tech Stack
- **Framework**: Spring Boot (latest stable version).
- **ORM**: Spring Data JPA / Hibernate.
- **Database**: PostgreSQL.
- **Caching**: Redis.
- **Migrations**: Flyway.

## Spring Boot Architecture & Service Layer
- **Layered Architecture**: Always follow the standard structure:
  - **Controller**: Handles HTTP request mapping, validation, and converts DTOs to/from entities.
  - **CachedService**: Decorates the underlying Service class and houses all Spring caching annotations (`@Cacheable`, `@CacheEvict`, etc.) to prevent internal self-invocation proxy bypass.
  - **Service**: Implements transaction boundaries (`@Transactional`) and encapsulates business logic.
  - **Repository**: Interface extending `JpaRepository` for data access.
  - **Entity**: Represents the database table schemas.
- **DTO Pattern**: Avoid exposing raw JPA entities in controller API endpoints. Use DTOs for request/response payloads to prevent lazy initialization issues and security vulnerabilities.

## Spring Data JPA and Auditing Guidelines
- **Primary Keys**: Always use UUID version 7 (time-ordered UUIDs) for all entity primary keys to maintain natural temporal ordering and optimize B-Tree database index insertions.
- **Entity Auditing**: All main domain entities must extend a base audited entity containing:
  - `@CreatedDate LocalDateTime createdAt`
  - `@LastModifiedDate LocalDateTime updatedAt`
  - `@CreatedBy String createdBy`
  - `@LastModifiedBy String updatedBy`
- **Audit Configuration**: Enable auditing via `@EnableJpaAuditing` and define an `AuditorAware` bean to automatically capture the user session from the security context.
- **Avoid N+1 Queries**: Use `@EntityGraph` or `JOIN FETCH` queries in repositories for fetching related entities instead of relying on lazy loading in loops.

## Redis Caching Strategy
- **Service Layer Routing**: All cache annotations must reside in the **CachedService** layer (not directly in the main `Service` or `Repository` layers). The request path must follow: `Controller -> CachedService -> Service -> JPARepository`.
- **Declarative Caching**: Use Spring Cache annotations on CachedService methods:
  - `@Cacheable`: Cache method results. Define unique keys using SpEL (e.g. `#id`).
  - `@CacheEvict`: Remove entry/entries from the cache. Ensure to evict list caches when writing/updating individual records.
  - `@CachePut`: Update the cache with new values.
- **Configuration**:
  - Configure `RedisCacheManager` to use JSON serialization (`GenericJackson2JsonRedisSerializer`) instead of default Java serialization. This keeps the Redis keys readable.
  - Define custom Time-To-Live (TTL) values per cache configuration (e.g., 10 minutes for fast-changing data, 1 hour for static reference data).

## Database Migrations (Flyway)
- **SQL-Based Versioning**: All schema changes must be managed via SQL migration files.
- **Location**: Store migration scripts in `src/main/resources/db/migration/`.
- **Naming Convention**: `V<YYYYMMDDHHMMSS>__<descriptive_name>.sql` (e.g. `V202605231340__create_users_table.sql`).
- **Explicit Indexing**: Every migration creating a new table must explicitly define indexes on foreign keys, lookups, and heavily queried columns (e.g. `CREATE INDEX idx_events_user_id ON events(user_id);`).
- **Immutable Files**: Never edit an already applied Flyway migration file. If a change is needed, create a new versioned migration script to modify the schema.

## Security & Exception Mappings
- **JWT Stateless Security**: Setup stateless filters validation in Spring Security. Permitted routes (e.g. `/api/auth/**`) do not require tokens, all other paths authenticate using stateless JWT bearer tokens.
- **Redis Namespacing**: Always prefix Redis keys with `planohi:<module>:<identifier>` to avoid collision in shared instances.
- **Problem Details Response**: Implement global `@RestControllerAdvice` to map validation errors (`MethodArgumentNotValidException`) and exceptions to standard RFC 7807 problem detail responses.
- **OpenAPI / Swagger Spec**: Enforce `springdoc-openapi` documentation configuration inside dev profiles, defining standard annotations (`@Operation`, `@ApiResponse`) on controllers and endpoints.
