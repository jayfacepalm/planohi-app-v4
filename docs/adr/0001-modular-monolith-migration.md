# ADR 0001: Modular Monolith Migration & AWS Infrastructure Cost Optimization

## Status
Approved

## Context
Our system was originally designed with a distributed microservices-like architecture comprising:
1. `api`: Spring Boot REST backend.
2. `email`: Spring Boot background worker for processing email queues.
3. `activitylogs`: Spring Boot background worker for recording user activity logs.
4. `rabbitmq`: RabbitMQ broker for asynchronous message coordination.
5. `web`: Next.js frontend web application.

In production/staging environments on AWS Fargate, this required provisioning:
* Five separate ECS Task Definitions and ECS Services.
* An Amazon MQ Broker hosting RabbitMQ (costing ~$30+/month).
* An ElastiCache Serverless Redis cache (with a minimum monthly fee of ~$45).
* A NAT Gateway and Elastic IP (costing ~$33+/month) to allow private subnets outbound connectivity to pull images from ECR and fetch Secrets Manager configurations.

This topology led to significant cloud overhead (~$120+/month minimum cost for staging environment), complex local docker-compose coordination, and high maintenance latency.

## Decision
To reduce AWS running costs and simplify local development, we made the following changes:
1. **Consolidate Services**: Merged the codebases of `/email` and `/activityLogs` back into the `/api` monolithic codebase under the `/api` directory.
2. **In-Memory Event Publishing**: Replaced the RabbitMQ broker with Spring's native in-memory `ApplicationEventPublisher`. Background jobs are now processed asynchronously using Spring's `@TransactionalEventListener` execution.
3. **Consolidated ECS Fargate Service**: Deleted separate `email`, `activitylogs`, and `api` ECS services. Combined the `web` (Next.js) and `api` (Spring Boot JVM) containers into a single ECS Task definition running under a unified `web` ECS Service. Next.js accesses the API locally via `http://localhost:8080` using shared network namespaces.
4. **Public Network Placement**: Removed the AWS NAT Gateway and Elastic IPs. Placed the consolidated ECS task in public subnets with public IPs enabled. This allows tasks to pull Docker images directly from ECR and send logs to CloudWatch without passing through a NAT Gateway.
5. **Downsized Redis**: Replaced ElastiCache Serverless with a provisioned single-node `cache.t4g.micro` Redis cluster (~$11/month).
6. **Infrastructure Parameterization**: Parameterized Fargate task sizing variables (`ecs_task_cpu`, `ecs_task_memory`, `ecs_task_count`), RDS database instance class (`rds_instance_class`), and Redis cache type (`redis_node_type`) in variables to support quick upscaling.

## Consequences
* **Cost Reduction**: Reaching ~$15-$20/month running cost on staging, saving ~$100+/month.
* **Simplified Operations**: Local development does not require running RabbitMQ or separate JVM processes; running `docker compose up` starts only 5 containers (Next.js `web`, Spring Boot `api`, Postgres `db`, Redis `cache`, and `localstack`).
* **Durability Trade-off**: By moving from persistent RabbitMQ queuing to JVM in-memory event queues, any pending events (e.g. queue of unsent emails or activity logs) will be lost if the container crashes or restarts.
* **Mitigation**: Enabled Spring Boot graceful shutdown (`server.shutdown=graceful`) and set `awaitTerminationSeconds = 30` on the thread pool executor to allow pending tasks to flush during rollouts.
