# Docker Infrastructure Guidelines

This document details the configuration and standard files for the local container orchestration of **planohi-app-v4**.

---

## 1. Local Orchestration (`docker-compose.yml`)

The root directory contains a central `docker-compose.yml` file to boot the complete ecosystem.

### Standard `docker-compose.yml` Structure

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: planohi-db
    ports:
      - "${DB_PORT:-5432}:5432"
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-planohidb}
      POSTGRES_USER: ${POSTGRES_USER:-planohiuser}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-planohipassword}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-planohiuser} -d ${POSTGRES_DB:-planohidb}"]
      interval: 5s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    container_name: planohi-cache
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redisdata:/data
    command: redis-server --save 60 1 --loglevel warning
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: planohi-api
    ports:
      - "${API_PORT:-8080}:8080"
    environment:
      SPRING_PROFILES_ACTIVE: dev
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/${POSTGRES_DB:-planohidb}
      SPRING_DATASOURCE_USERNAME: ${POSTGRES_USER:-planohiuser}
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD:-planohipassword}
      SPRING_DATA_REDIS_HOST: cache
      SPRING_DATA_REDIS_PORT: 6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
    networks:
      - app-network

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    container_name: planohi-web
    ports:
      - "${WEB_PORT:-3000}:3000"
    environment:
      BACKEND_API_URL: http://api:8080
      NEXT_PUBLIC_API_URL: /api/proxy
    depends_on:
      - api
    networks:
      - app-network

volumes:
  pgdata:
  redisdata:

networks:
  app-network:
    driver: bridge
```

---

## 2. Multi-stage Dockerfiles

To optimize image loading speed and minimize runtime footprints, both components must use multi-stage Docker builds.

### API (Spring Boot) - `api/Dockerfile`
```dockerfile
# Stage 1: Build JAR file
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Create runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Web (Next.js) - `web/Dockerfile`
```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build client
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 3. Environment Variables Configuration

Create a template file `.env.example` in the root workspace folder:

```ini
# Database configuration
POSTGRES_DB=planohidb
POSTGRES_USER=planohiuser
POSTGRES_PASSWORD=planohisecretpassword
DB_PORT=5432

# Redis cache configuration
REDIS_PORT=6379

# Applications ports configuration
API_PORT=8080
WEB_PORT=3000

# Backend URL used by Next.js server proxy (internal docker network lookup)
BACKEND_API_URL=http://api:8080
```
To run the setup, copy `.env.example` to `.env` and run:
```bash
docker compose up --build -d
```

---

## 4. Local Database Seeding (Development Environment)

To ensure developers boot into a fully populated UI, the system uses automated database seeding rules:

1. **Flyway Development Seeds**:
   - Store SQL seed scripts in `src/main/resources/db/migration/dev/` or utilize Flyway's `afterMigrate.sql` callback capability to execute database seeds during container initialization.
   - Example callback path: `src/main/resources/db/callback/afterMigrate.sql`. This file must contain standard SQL statements inserting default test users, mock events, and configurations.
2. **Java Application Seed Runner**:
   - Alternatively, implement a Spring `CommandLineRunner` or `ApplicationRunner` class annotated with `@Profile("dev")`.
   - The runner checks if the database contains records; if empty, it instantiates mock domain entities and writes them to PostgreSQL repositories (e.g. creating a default admin user, demo events, and tags).
3. **Seeding Conditionals**:
   - All seed scripts and runners must strictly verify that they are running under the `dev` profile to prevent accidental seeding or data overwrites in Staging and Production databases.

