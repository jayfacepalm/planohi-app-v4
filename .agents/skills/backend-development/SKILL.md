---
name: backend-development
description: Guidelines and rules for building/updating the Spring Boot backend, JPA, caching with Redis, and database migrations. Use this when writing Java classes, entities, database queries, and SQL migration files.
---

# Spring Boot Backend Development Skill

Use this skill when developing or modifying the backend code of the Spring Boot application (`/api`).

## Core Tech Stack
- **Java**: Java 21.
- **Framework**: Spring Boot 4.1.0 (`spring-boot-starter-web`, `spring-boot-starter-security`, `spring-boot-starter-validation`, `spring-boot-starter-quartz`, `spring-boot-starter-mail`).
- **ORM / Persistence**: Spring Data JPA / Hibernate 6 (`spring-boot-starter-data-jpa`).
- **Database**: PostgreSQL (`postgresql`, `flyway-database-postgresql`).
- **Caching**: Redis (`spring-boot-starter-data-redis`).
- **Database Migrations**: Flyway (`spring-boot-starter-flyway`).
- **Security & JWT**: JJWT 0.12.5 (`jjwt-api`, `jjwt-impl`, `jjwt-jackson`).
- **Storage / Cloud**: AWS SDK v2 for S3 (`software.amazon.awssdk:s3:2.25.15`).
- **Utilities**: Lombok, Google API Client (`com.google.api-client:google-api-client:2.7.0`).

## Spring Boot Layered Architecture & Service Layer
Always follow the established 4-tier structure:
1. **Controller (`com.planohi.api.controller`)**:
   - Annotated with `@Slf4j`, `@RestController`, `@RequestMapping("/api/...")`, and `@RequiredArgsConstructor`.
   - Handles HTTP request mappings, input validation (`@Valid`), extracts `@AuthenticationPrincipal UserPrincipal`, and returns `ResponseEntity<ApiResponse<T>>`.
2. **CachedService (`com.planohi.api.service.cached`)**:
   - Decorates the underlying `Service` implementation and houses all Spring Cache annotations (`@Cacheable`, `@CacheEvict`, `@Caching`).
   - Sits between Controller and Service (`Controller -> CachedService -> Service -> JpaRepository`) to prevent Spring AOP proxy self-invocation bypass.
3. **Service Interface (`com.planohi.api.service`) & Implementation (`com.planohi.api.service.impl`)**:
   - Contains business logic, encapsulates workspace authorization checks via `WorkspaceSecurityService`, and manages transaction boundaries.
   - Annotate write/mutation methods with `@Transactional` and read methods with `@Transactional(readOnly = true)`.
4. **Repository (`com.planohi.api.repository`)**:
   - Interfaces extending `JpaRepository<Entity, UUID>`.
   - Uses JPQL / HQL queries or native SQL for complex aggregations and joins to avoid N+1 query problems.
5. **Entity (`com.planohi.api.entity`)**:
   - Maps database table schemas and extends `BaseAuditEntity`.

## JPA Entities, Auditing, & Data Types
1. **Primary Key Strategy**:
   - Use time-based UUID v7 for all entity primary keys using Hibernate 6 generators:
     ```java
     @Id
     @GeneratedValue
     @UuidGenerator(style = UuidGenerator.Style.TIME)
     @Column(name = "id", updatable = false, nullable = false)
     private UUID id;
     ```
2. **Entity Auditing (`BaseAuditEntity`)**:
   - All domain entities extend `BaseAuditEntity` (`@MappedSuperclass` with `@EntityListeners(AuditingEntityListener.class)`).
   - Use **`Instant`** for timestamps (NOT `LocalDateTime`):
     - `@CreatedDate @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;`
     - `@LastModifiedDate @Column(name = "updated_at", nullable = false) private Instant updatedAt;`
     - `@CreatedBy @Column(name = "created_by", updatable = false) private String createdBy;`
     - `@LastModifiedBy @Column(name = "updated_by") private String updatedBy;`
3. **Lombok Usage Rules for JPA Entities**:
   - Use `@Getter`, `@Setter`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor` on Entities.
   - **NEVER use `@Data` on JPA Entities**: `@Data` generates `equals`, `hashCode`, and `toString` methods that inspect lazily-loaded associations, causing lazy initialization exceptions or infinite recursion deadlocks.
4. **Query Optimization**:
   - Avoid N+1 queries by using custom JPQL joins, `@EntityGraph`, or explicit DTO projections.

## API Response Envelope & DTO Pattern
1. **Unified Response Envelope (`ApiResponse<T>`)**:
   - All controller endpoints must return responses wrapped in `ApiResponse<T>` (`com.planohi.api.dto.ApiResponse`):
     ```java
     public class ApiResponse<T> {
         private String status; // "SUCCESS" | "FAILED"
         private String msg;
         private T result;
     }
     ```
   - Use static factory methods: `ApiResponse.success(result)`, `ApiResponse.success(msg, result)`, `ApiResponse.failed(msg)`, `ApiResponse.failed(msg, errors)`.
2. **DTO Pattern**:
   - Never return JPA entities directly in API endpoints.
   - Request DTOs must use Jakarta Validation annotations (`@NotBlank`, `@NotNull`, `@Email`, `@Size`, `@Valid`).
   - DTOs use Lombok `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor` and `Instant` for dates.

## Redis Caching Strategy
1. **CachedService Isolation**:
   - All `@Cacheable`, `@CacheEvict`, and `@Caching` annotations must reside **exclusively inside `com.planohi.api.service.cached` classes**.
2. **Cache Eviction Rules**:
   - Use SpEL for unique key definitions (e.g. `key = "#userId.toString() + ':' + #eventId.toString()"`).
   - On mutations (create/update/delete), evict related detail and list caches using `@CacheEvict` or `@Caching(evict = { ... })`.
3. **Binary Data Exclusion**:
   - Never cache binary payloads (e.g. image byte arrays or S3 banner streams) in Redis to prevent memory bloating.

## Security, Filters, & Workspace Role Verification
1. **Spring Security Filter Chain (`SecurityConfig`)**:
   - Stateless session management (`SessionCreationPolicy.STATELESS`).
   - Public paths: `/api/auth/**`, `/api/public/**`.
   - Filter pipeline order:
     1. `CorrelationIdFilter`: Generates or propagates `X-Correlation-Id` tracing headers.
     2. `ApiKeyFilter`: Validates mandatory `X-API-Key` header against `SECURITY_API_KEY`.
     3. `JwtAuthenticationFilter`: Extracts JWT from `AUTH_TOKEN` cookie or Bearer header, validates via `JwtService`, and populates `SecurityContextHolder` with `UserPrincipal`.
2. **Workspace & Event Role Security**:
   - Inject `WorkspaceSecurityService` for workspace role token validation (`X-Event-Role-Token` header).
   - Enforce role requirements (e.g., `ORGANIZER`, `OWNER`) on sensitive mutation methods.

## Global Exception Handling (`GlobalExceptionHandler`)
1. **Global Exception Controller Advice**:
   - `@RestControllerAdvice` handling custom and Spring exceptions:
     - `MethodArgumentNotValidException` & `FieldValidationException`: Returns HTTP 400 Bad Request with `ApiResponse.failed("Validation failed", fieldErrorsMap)`.
     - `EntityNotFoundException`: Returns HTTP 404 NOT_FOUND with `ApiResponse.failed(msg)`.
     - `UserAlreadyExistsException`: Returns HTTP 409 CONFLICT with `ApiResponse.failed(msg)`.
     - `ProposalSubmittedException`: Returns HTTP 202 ACCEPTED with proposal DTO.
     - General `Exception`: Returns HTTP 500 INTERNAL_SERVER_ERROR with `ApiResponse.failed("An unexpected error occurred on the server.")`.

## Database Migrations (Flyway)
1. **SQL-Based Schema Versioning**:
   - Migration scripts location: `api/src/main/resources/db/migration/`.
   - Naming pattern: `V<YYYYMMDDHHMMSS>__<descriptive_name>.sql` (e.g. `V20260524000100__create_user_account.sql`, `V20260702120000__add_event_currency.sql`).
2. **PostgreSQL Timestamp Types**:
   - Use `TIMESTAMPTZ` for all timestamp columns (e.g., `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`).
3. **Explicit Indexing**:
   - Define explicit indexes on foreign key columns, lookups, and heavily queried fields (e.g., `CREATE INDEX idx_event_user_id ON event(user_id);`).
4. **Immutability**:
   - Applied migration files are immutable. Always create a new versioned migration script to alter existing schemas.
