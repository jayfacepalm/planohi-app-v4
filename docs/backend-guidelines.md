# Spring Boot Backend Development Guidelines

This document establishes the architecture, folder structure, and coding standards for the Java backend of **planohi-app-v4**.

---

## 1. Directory Structure

All backend code lives in the `api/` subdirectory.

```text
api/
├── src/
│   ├── main/
│   │   ├── java/com/planohi/api/
│   │   │   ├── config/          # Configuration beans (Security, Redis, Auditing)
│   │   │   ├── controller/      # REST API Controllers (exposes JSON endpoints)
│   │   │   ├── dto/             # Data Transfer Objects (Request/Response)
│   │   │   ├── entity/          # JPA Hibernate Entities
│   │   │   ├── repository/      # Spring Data JPA Repository Interfaces
│   │   │   ├── service/         # Business Logic Service Interfaces
│   │   │   │   ├── cached/      # CachedService implementations wrapping services
│   │   │   │   └── impl/        # Standard transactional Business Service implementations
│   │   │   └── exception/       # Global Exception Handler and custom exceptions
│   │   └── resources/
│   │       ├── db/migration/    # Flyway database migration scripts (V1__, V2__)
│   │       ├── application.yml  # Global configuration variables
│   │       └── application-dev.yml
│   └── test/                    # Unit and integration tests (JUnit 5, Mockito)
└── pom.xml / build.gradle       # Build and dependency manager
```

---

## 2. Spring Data JPA & Auditing

### Entity Guidelines
1. **No direct Entity exposure**: Controllers must always receive and return DTO classes.
2. **Lazy Loading**: Map all relationships (`@OneToMany`, `@ManyToMany`, `@ManyToOne`) as `FetchType.LAZY` to prevent massive unintended database queries.
3. **Primary Keys**: Always use UUID version 7 (time-ordered UUIDs) for all entity primary keys. In Hibernate 6 / Spring Boot 3.2+, configure this using:
   ```java
   @Id
   @GeneratedValue
   @org.hibernate.annotations.UuidGenerator(style = org.hibernate.annotations.UuidGenerator.Style.TIME)
   private UUID id;
   ```

### Auditing Configuration
Create a shared audited entity class to avoid repeating tracking columns:

```java
package com.planohi.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Getter
@Setter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseAuditEntity {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by")
    private String updatedBy;
}
```

*Note: Add `@EnableJpaAuditing` to a `@Configuration` class, and provide a bean implementing `AuditorAware<String>` to extract the authenticated user identity.*

---

## 3. Database Schema Migrations (Flyway)

1. **Version Control**: Every database schema change must be documented as an SQL file.
2. **Scripts Path**: `src/main/resources/db/migration/`
3. **Naming Scheme**: `V<Timestamp>__<description>.sql` where timestamp format is `YYYYMMDDHHMMSS` to ensure correct application sequence.
4. **Explicit Indexing**: Every migration that defines a new table structure must explicitly create indexes on foreign keys, lookup keys, and heavily queried fields (e.g. `CREATE INDEX idx_events_user_id ON events(user_id);`).
5. **Immutability**: Once a migration has run on any env (including local), it must not be modified. Write a corrective migration script if changes are needed.

---

## 4. Caching with Redis

To optimize latency, Spring Boot must utilize Redis for read-heavy operations (e.g. event search, user settings, configuration options).

### Spring Cache Configuration
Inject a custom `RedisCacheManager` configured to use JSON serialization so cached entries can be read and debugged inside Redis tools:

```java
@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10)) // Default TTL
            .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
                new GenericJackson2JsonRedisSerializer()
            ));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(config)
            .withCacheConfiguration("static_metadata", config.entryTtl(Duration.ofHours(24)))
            .withCacheConfiguration("frequent_queries", config.entryTtl(Duration.ofMinutes(5)))
            .build();
    }
}
```

### Declarative Caching via CachedService
All cache annotations must reside in the **CachedService** layer. Under this design:
- The `Controller` injects the `CachedService`.
- The `CachedService` implements caching rules, wrapping and calling the underlying transactional `Service` class.
- The `Service` handles business logic and calls the `JPARepository`.

This ensures proxy isolation, avoiding issues where caching is bypassed due to internal self-invocation within the same service class.

#### Example Architecture and Annotations

```java
// 1. Service Interface & Implementation (No cache annotations here)
@Service
@Transactional
@RequiredArgsConstructor
public class EventServiceImpl implements EventService {
    private final EventRepository eventRepository;

    @Override
    @Transactional(readOnly = true)
    public Event getEventById(UUID id) {
        return eventRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Event not found"));
    }

    @Override
    public Event createEvent(Event event) {
        return eventRepository.save(event);
    }
}

// 2. CachedService wrapper containing Caching Annotations
@Service
@RequiredArgsConstructor
public class CachedEventService {
    private final EventService eventService;

    @Cacheable(value = "events", key = "#id")
    public Event getEventById(UUID id) {
        return eventService.getEventById(id);
    }

    @CacheEvict(value = "events", allEntries = true)
    public Event createEvent(Event event) {
        return eventService.createEvent(event);
    }
}
```

---

## 5. Security & JWT Filtering

The backend implements stateless JWT token-based authentication via Spring Security:

1. **Security Filters**: A custom `JwtAuthenticationFilter` intercepts HTTP requests, extracts the JWT bearer token from the `Authorization` header, validates it using a secret key, and initializes the `UsernamePasswordAuthenticationToken` inside Spring Security's `SecurityContextHolder`.
2. **Context Setup**: Do not use HTTP sessions; keep sessions entirely stateless:
   ```java
   @Bean
   public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
       http.csrf(AbstractHttpConfigurer::disable)
           .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
           .authorizeHttpRequests(auth -> auth
               .requestMatchers("/api/auth/**").permitAll()
               .anyRequest().authenticated()
           )
           .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
       return http.build();
   }
   ```

---

## 6. Redis Caching Namespaces

To prevent key collision inside shared Redis servers, all cache values must use structured namespaces:
- **Prefix Pattern**: `planohi:<module_name>:<variable_name>`
- **Configuration**: Set custom key prefixes in `RedisCacheConfiguration` by appending namespaces or defining explicit key generators.
- **Example Keys**:
  - Event details cache: `planohi:events::uuid-1234`
  - User details cache: `planohi:users::username-admin`

---

## 7. Global Exception Advice (`@ControllerAdvice`)

All controllers delegate runtime and validation exception handling to a global handler. This transforms raw exceptions into standard `ApiResponse` JSON envelopes containing error details, keeping all API error responses unified:

```java
package com.planohi.api.exception;

import com.planohi.api.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 1. Validation errors (jakarta.validation.Valid constraint failures)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> 
            errors.put(error.getField(), error.getDefaultMessage())
        );
        ApiResponse<Map<String, String>> response = ApiResponse.failed("Validation failed", errors);
        return ResponseEntity.badRequest().body(response);
    }

    // 2. Resource Not Found anomalies
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFoundException(EntityNotFoundException ex) {
        ApiResponse<Void> response = ApiResponse.failed(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    // 3. General Runtime exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(Exception ex) {
        ApiResponse<Void> response = ApiResponse.failed(ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
```

---

## 8. Standard API Response Envelope

Every JSON payload returned by PlanoHi endpoints must reside in a standardized response envelope. This guarantees consistent response handling on the Next.js frontend:

### Structure (`ApiResponse.java`)

```java
package com.planohi.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private String status; // "SUCCESS" or "FAILED"
    private String msg;    // Explanatory message
    private T result;      // The actual payload

    public static <T> ApiResponse<T> success(String msg, T result) {
        return new ApiResponse<>("SUCCESS", msg, result);
    }

    public static <T> ApiResponse<T> success(T result) {
        return success("Request processed successfully", result);
    }

    public static <T> ApiResponse<T> failed(String msg, T result) {
        return new ApiResponse<>("FAILED", msg, result);
    }

    public static <T> ApiResponse<Void> failed(String msg) {
        return failed(msg, null);
    }
}
```

---

## 9. Interactive API Documentation (Swagger / OpenAPI)

To document the API schemas, parameter types, and endpoints transparently:

1. **Dependency integration**: Add the `springdoc-openapi-starter-webmvc-ui` dependency to the build file (`pom.xml` / `build.gradle`).
2. **Access paths**: In development profiles, Swagger UI is exposed at `http://localhost:8080/swagger-ui/index.html`.
3. **Security integration**: Integrate Spring Security configuration with OpenAPI annotations so endpoints requiring authorization specify lock icons and accept bearer tokens:
   ```java
   @Configuration
   @OpenAPIDefinition(
       info = @Info(title = "PlanoHi API", version = "v4", description = "PlanoHi App Backend endpoints"),
       security = @SecurityRequirement(name = "BearerAuth")
   )
   @SecurityScheme(
       name = "BearerAuth",
       type = SecuritySchemeType.HTTP,
       scheme = "bearer",
       bearerFormat = "JWT",
       in = SecuritySchemeIn.HEADER
   )
   public class OpenApiConfig { }
   ```
4. **Endpoint Annotations**: Use `@Operation` and `@ApiResponse` annotations on Controller endpoints to describe business requirements, query behaviors, and error results.

---

## 10. Logging Guidelines

Verbose and detailed logging is required across all backend layers to ensure transparent debugging and operational visibility:

1. **SLF4J Logger Integration**: Annotate classes with Lombok's `@Slf4j` to auto-inject logger instances.
2. **Controller Logging**: Log the incoming HTTP method, path, and request parameters/payload summaries (excluding sensitive data like passwords). Log outgoing response status codes and elapsed execution time.
3. **Service Logging**: Log business method entries, logic branches, external data operations, and exits. Include relevant identifiers (e.g. event ID, user email).
4. **Exception Logging**: Ensure the global exception advice logs full exception traces at the `error` or `warn` level so failures are simple to troubleshoot.
5. **Log Levels**:
   - `INFO`: Significant lifecycle steps (startups, user registration completions, database seed runs).
   - `DEBUG`: Request tracing, caching operations (hits/misses), and filter evaluations.
   - `WARN`: User-driven errors (invalid OTP inputs, failed logins, bad requests).
   - `ERROR`: System anomalies, external service failures, and uncaught exceptions.



