---
name: infrastructure-setup
description: Guidelines and rules for configuring multi-stage Dockerfiles, root-level docker-compose, and managing environment parameters. Use this when writing dockerfiles, compose files, and env variables.
---

# Infrastructure and Docker Setup Skill

Use this skill when configuring or editing the infrastructure environment (Docker containers, network mappings, database orchestration, volume storage, and environment files).

## Core Tech Stack
- **Containerization**: Docker & Docker Compose.
- **Services**:
  - PostgreSQL (Database)
  - Redis (Cache)
  - Spring Boot (API Backend)
  - Next.js (Web Frontend)

## Root-Level Docker Compose Architecture
The repository must implement a single unified `docker-compose.yml` file in the root directory for orchestrating the complete local environment.
- **Service Dependency Ordering**:
  - `api` must specify `depends_on` both `db` and `cache` services.
  - Health checks (`pg_isready` for Postgres, `redis-cli ping` for Redis) must be used to ensure the database and cache are ready before the API server launches.
- **Internal Networking**:
  - All services run on a custom private network (e.g. `app-network`) to communicate using container hostnames (e.g. `http://api:8080/api` is called by the web middleware).
- **Persistent Volumes**:
  - Postgres: Mount a volume (e.g. `db_data:/var/lib/postgresql/data`) to prevent data loss when containers stop.
  - Redis: Mount a volume (e.g. `redis_data:/data`) to persist cached structures.

## Multi-stage Dockerfile Guidelines
To keep production images lightweight and secure, use multi-stage Dockerfiles.

### 1. Spring Boot (`api/Dockerfile`)
- **Stage 1 (Builder)**: Use `maven:3.9-eclipse-temurin-21` or `gradle:8-jdk21` to run the compile stage (`mvn clean package -DskipTests`).
- **Stage 2 (Runtime)**: Use a lightweight JRE image (e.g., `eclipse-temurin:21-jre-alpine`). Copy the compiled `.jar` file and run it as a non-root user.

### 2. Next.js (`web/Dockerfile`)
- **Stage 1 (Dependencies)**: Use `node:20-alpine` to install all package files (`package.json`, `package-lock.json`).
- **Stage 2 (Builder)**: Copy source code and execute `npm run build` to generate build outputs.
- **Stage 3 (Runtime)**: Use `node:20-alpine` copy only static folders, package dependencies, and the `.next/standalone` output directory to minimize image sizes.

## Environment Variable Architecture
- **Root `.env` Template**: Provide a `.env.example` in the root workspace outlining:
  - Database credentials (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`).
  - Port configurations (`API_PORT`, `WEB_PORT`, `DB_PORT`, `REDIS_PORT`).
  - Secret keys (`JWT_SECRET`, etc.).
- **Dynamic Configuration**: Configure Spring Boot (`application.yml`) and Next.js (`next.config.js`) to parse variables directly from environment environment variables mapped via docker-compose.

## Local Database Seeding
- **Seed Scripts**: Define dev-profile SQL scripts or Spring runners targeting mock entity configurations, strictly gated behind the `dev` profile to populate the database on initial container builds.
