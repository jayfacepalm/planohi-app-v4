# Sprint 12: Modular Monolith Migration & Cost Optimization

This sprint focuses on restructuring our architecture to minimize running costs on AWS. We will migrate our multi-service setup (API, Email, Activity Logs) into a single unified **Modular Monolith**, replace the RabbitMQ broker with Spring's native in-memory event publishing, simplify local development files (`docker-compose.yml`), and significantly downsize our staging/production Terraform infrastructure.

---

## 1. Goals

1. **Modular Monolith Consolidation**: Merge the source code and dependencies of `/api`, `/email`, and `/activityLogs` into a single, unified Maven project under the `/api` directory.
2. **Remove RabbitMQ**: Eliminate the external RabbitMQ broker entirely. Implement Spring's built-in `ApplicationEventPublisher` and asynchronous `@TransactionalEventListener` processing to handle events in-memory safely.
3. **Local Environment Simplification**: Remove the `rabbitmq`, `email`, and `activitylogs` containers from `docker-compose.yml` to save local resources and simplify the setup.
4. **AWS Infrastructure Downsizing**:
   * Delete the Amazon MQ RabbitMQ broker from Terraform (`rabbitmq.tf`).
   * Replace ElastiCache Serverless (minimum $45/month charge) with a provisioned single-node `cache.t4g.micro` ElastiCache Redis cluster (~$11/month).
   * Remove the AWS NAT Gateway and Elastic IP from `vpc.tf` (~$33/month saving).
   * Move the ECS Fargate tasks to public subnets with public IPs assigned so they can access ECR, S3, and CloudWatch directly without a NAT Gateway.
   * Remove the `email` and `activitylogs` ECS task definitions and services from `ecs.tf`.
5. **Graceful Shutdown & Durability**: Enable Spring Boot graceful shutdown and pool await settings to prevent event loss.
6. **Documentation**: Write an Architectural Decision Record (ADR) detailing the rationale, cost savings, and updated topology.

---

## 2. User Stories / Tasks

* **US-12.1 (Backend Consolidation)**: As a system operator, I want all backend controllers and workers to execute within a single JVM process to minimize server instance costs.
* **US-12.2 (RabbitMQ Removal & Spring Events)**: As a developer, I want to publish and handle background tasks (emails and activity logs) using Spring's in-memory events and asynchronous executors to eliminate dependency on an external message broker.
* **US-12.3 (AWS Infrastructure Cost Optimization)**: As a cloud administrator, I want the Terraform configuration to provision minimal infrastructure resources so that we reduce our cloud spend.
* **US-12.4 (Documentation & Design Update)**: As a developer, I want the architecture documentation updated to reflect the transition from microservices to a modular monolith.

---

## 3. Technical & Database Design

### 1. Spring Boot Event Architecture
Instead of publishing objects to RabbitMQ exchanges, the API module will publish Spring events. 

#### Event DTOs
Define `EmailSendEvent` and `ActivityLogEvent` classes under package `com.planohi.api.event`:
```java
package com.planohi.api.event;

import com.planohi.api.dto.EmailMessageDto;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class EmailSendEvent extends ApplicationEvent {
    private final EmailMessageDto message;

    public EmailSendEvent(Object source, EmailMessageDto message) {
        super(source);
        this.message = message;
    }
}
```

```java
package com.planohi.api.event;

import com.planohi.api.dto.ActivityLogEvent;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ActivityLogPublishEvent extends ApplicationEvent {
    private final ActivityLogEvent logEventData;

    public ActivityLogPublishEvent(Object source, ActivityLogEvent logEventData) {
        super(source);
        this.logEventData = logEventData;
    }
}
```

#### Asynchronous Execution Configuration & MDC Trace Propagation
Create `AsyncConfig.java` under package `com.planohi.api.config` to enable `@Async` support with an `MdcTaskDecorator` and graceful shutdown settings:
```java
package com.planohi.api.config;

import org.slf4j.MDC;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import java.util.Map;
import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("AsyncExecutor-");
        
        // Propagate MDC context (correlationId, etc.) to async threads
        executor.setTaskDecorator(new MdcTaskDecorator());
        
        // Enable graceful shutdown settings
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        
        executor.initialize();
        return executor;
    }

    private static class MdcTaskDecorator implements TaskDecorator {
        @Override
        public Runnable decorate(Runnable runnable) {
            Map<String, String> contextMap = MDC.getCopyOfContextMap();
            return () -> {
                try {
                    if (contextMap != null) {
                        MDC.setContextMap(contextMap);
                    }
                    runnable.run();
                } finally {
                    MDC.clear();
                }
            };
        }
    }
}
```

### 2. Spring Event Publishers
Refactor the publisher classes in `api` to publish local Spring events instead of RabbitMQ payloads:

* **`SpringEventEmailPublisher`**:
  ```java
  package com.planohi.api.service.impl;

  import com.planohi.api.dto.EmailMessageDto;
  import com.planohi.api.event.EmailSendEvent;
  import com.planohi.api.service.EmailPublisher;
  import lombok.RequiredArgsConstructor;
  import org.springframework.context.ApplicationEventPublisher;
  import org.springframework.stereotype.Service;

  @Service
  @RequiredArgsConstructor
  public class SpringEventEmailPublisher implements EmailPublisher {
      private final ApplicationEventPublisher eventPublisher;

      @Override
      public void publishEmail(EmailMessageDto message) {
          eventPublisher.publishEvent(new EmailSendEvent(this, message));
      }
  }
  ```

* **`ActivityLogPublisher`**:
  Update `ActivityLogPublisher.java` to inject `ApplicationEventPublisher` and replace the `rabbitTemplate.convertAndSend` call with:
  ```java
  eventPublisher.publishEvent(new ActivityLogPublishEvent(this, event));
  ```

### 3. Spring Event Listeners (Consumers)
Refactor the old consumers to listen to the published events. We use `@TransactionalEventListener` with `AFTER_COMMIT` phase (and `fallbackExecution = true`) to ensure that database side effects and email dispatches only execute when the initiating database transaction successfully commits.

* **`EmailEventListener`** (Ported from `/email` module):
  ```java
  package com.planohi.api.email.listener;

  import com.planohi.api.event.EmailSendEvent;
  import com.planohi.api.email.service.EmailSenderService;
  import lombok.RequiredArgsConstructor;
  import org.springframework.transaction.event.TransactionPhase;
  import org.springframework.transaction.event.TransactionalEventListener;
  import org.springframework.scheduling.annotation.Async;
  import org.springframework.stereotype.Component;

  @Component
  @RequiredArgsConstructor
  public class EmailEventListener {
      private final EmailSenderService emailSenderService;

      @Async
      @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
      public void handleEmailSendEvent(EmailSendEvent event) {
          emailSenderService.processAndSendEmail(event.getMessage());
      }
  }
  ```

* **`ActivityLogEventListener`** (Ported from `/activityLogs` module):
  ```java
  package com.planohi.api.activitylogs.listener;

  import com.planohi.api.event.ActivityLogPublishEvent;
  import com.planohi.api.activitylogs.entity.ActivityLog;
  import com.planohi.api.activitylogs.repository.ActivityLogRepository;
  import lombok.RequiredArgsConstructor;
  import org.springframework.transaction.event.TransactionPhase;
  import org.springframework.transaction.event.TransactionalEventListener;
  import org.springframework.scheduling.annotation.Async;
  import org.springframework.stereotype.Component;

  @Component
  @RequiredArgsConstructor
  public class ActivityLogEventListener {
      private final ActivityLogRepository activityLogRepository;

      @Async
      @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
      public void handleActivityLogEvent(ActivityLogPublishEvent springEvent) {
          var event = springEvent.getLogEventData();
          ActivityLog activityLog = ActivityLog.builder()
                  .correlationId(org.slf4j.MDC.get("correlationId"))
                  .userId(event.getUserId())
                  .userAlias(event.getUserAlias())
                  .action(event.getAction())
                  .entityType(event.getEntityType())
                  .entityId(event.getEntityId())
                  .eventId(event.getEventId())
                  .status(event.getStatus())
                  .details(event.getDetails())
                  .timestamp(event.getTimestamp())
                  .build();
          activityLogRepository.save(activityLog);
      }
  }
  ```

### 4. Cache & Dependency Integration Details
* **Redis Caching**: Add the `"email_templates"` cache configuration directly to the existing `cacheManager` bean builder in [CacheConfig.java](/planohi-app-v4/api/src/main/java/com/planohi/api/config/CacheConfig.java).
* **POM Adjustments**: 
  * Add `spring-boot-starter-mail` to [pom.xml](/planohi-app-v4/api/pom.xml).
  * Remove `spring-boot-starter-amqp` from [pom.xml](/planohi-app-v4/api/pom.xml).

---

## 4. Local Development Environment (`docker-compose.yml`)

1. **Remove RabbitMQ**: Delete the `rabbitmq` container definition and ECR volumes.
2. **Remove Separate Workers**: Delete the `email` and `activitylogs` container definitions.
3. **Configure API Mail Dev Settings**:
   Add the standard Spring mail configuration variables to the `api` service environment:
   ```yaml
   SPRING_MAIL_HOST: maildev
   SPRING_MAIL_PORT: 1025
   ```
4. **Remove Dependencies**: Remove `rabbitmq` from the `depends_on` lists of the `api` and `web` containers.

---

## 5. AWS Terraform Cost Modifications

1. **Delete RabbitMQ**:
   * Delete [rabbitmq.tf](/planohi-app-v4/infra/terraform/rabbitmq.tf).
   * Remove any MQ-related security groups in `security_groups.tf`.
   * Remove variables like `rabbitmq_username` and `rabbitmq_password` from `variables.tf`.
2. **Downsize Redis (ElastiCache)**:
   * Replace `aws_elasticache_serverless_cache` with `aws_elasticache_cluster` using node type `cache.t4g.micro` and `num_cache_nodes = 1` in [elasticache.tf](/planohi-app-v4/infra/terraform/elasticache.tf).
3. **Remove NAT Gateway**:
   * Remove `aws_nat_gateway.nat` and `aws_eip.nat` from [vpc.tf](/planohi-app-v4/infra/terraform/vpc.tf).
   * Delete the default `0.0.0.0/0` route in `aws_route_table.private` since private resources (DB, Redis) do not need outbound internet access.
4. **Single-Task Multi-Container ECS Consolidation**:
   * In [ecs.tf](/planohi-app-v4/infra/terraform/ecs.tf):
     * **Delete Services**: Delete ECS services and task definitions for `email`, `activitylogs`, and `api`.
     * **Delete ECR Repositories**: Delete ECR repositories for `planohi-email` and `planohi-activitylogs`. Keep `planohi-web` and `planohi-api`.
     * **Combine Task Definition**: Modify the `web` task definition to include **two** container definitions: `web` (port 3000) and `api` (port 8080).
     * **Update Environment Variables**: Set the `BACKEND_API_URL` env variable in the `web` container definition to `http://localhost:8080` (or `http://127.0.0.1:8080`) since they share the localhost network.
     * **Delete DNS Discovery**: Remove the private DNS namespace `planohi.local-${var.environment}` and Service Connect configurations as they are no longer needed.
     * **Subnet & IP Shifting**: Update the `web` service network configuration to use `subnets = aws_subnet.public[*].id` and set `assign_public_ip = true` to allow outbound connectivity for pulling images from ECR without a NAT Gateway.

## 5.4 CI/CD Deployment Workflow Changes

To support the consolidated single-task multi-container deployment, we will update [.github/workflows/deploy.yml](/planohi-app-v4/.github/workflows/deploy.yml):
1. **Remove unused jobs**: Delete the `deploy-email` and `deploy-activitylogs` jobs.
2. **Consolidate build & deployment flow**:
   * The workflow will detect changes in `web/` and/or `api/`.
   * The `deploy-web` and `deploy-api` build steps will compile and push their respective Docker images (`planohi-web` and `planohi-api`) to ECR in parallel if changes are detected.
   * After the builds complete, the workflow triggers a single deployment of the unified `web` ECS service (which houses both containers):
     ```bash
     aws ecs update-service --cluster planohi-cluster-${{ env.ENV_NAME }} --service web --force-new-deployment
     ```

## 5.5 Code Deletion & Cleanup Checklist

To clean up old RabbitMQ and multi-service code paths from the repository:
1. **Delete `/api` RabbitMQ configurations & classes**:
   * Delete [RabbitMqConfig.java](/planohi-app-v4/api/src/main/java/com/planohi/api/config/RabbitMqConfig.java).
   * Delete [RabbitMqEmailPublisher.java](/planohi-app-v4/api/src/main/java/com/planohi/api/service/impl/RabbitMqEmailPublisher.java).
2. **Delete external microservice code folders**:
   * Delete the whole `/email` directory from the repository.
   * Delete the whole `/activityLogs` directory from the repository.

## 5.6 Known Risks & Durability Trade-offs

> [!WARNING]
> **Loss of Message Durability**
> By removing the RabbitMQ broker, we migrate from persistent queuing to JVM in-memory event queues. If the application server crashes or restarts, any events currently sitting in the queue (e.g. pending emails or activity logs) will be lost.
> 
> **Mitigation Strategy**:
> * Enabled Spring Boot graceful shutdown (`server.shutdown=graceful`) so that the application awaits task completion before shutting down.
> * Configured `awaitTerminationSeconds = 30` on the thread pool executor to allow pending tasks to flush during rolling updates.
> * This trade-off is accepted to eliminate the Amazon MQ monthly broker fees.

---

## 6. Infrastructure Parameterization & Scalability Strategy

To ensure that our minimal infrastructure can scale up instantly in case we need a "quick bump of power", we will parameterize the resource allocations (task counts, instance classes, and CPU/memory allocations) using Terraform variables. 

This enables developers and operators to scale the infrastructure horizontally or vertically simply by editing their variable files (e.g., `staging.tfvars` or `prod.tfvars`) without modifying any Terraform infrastructure source code.

### 1. Variables Definition (`variables.tf`)
We will declare the following variables in `variables.tf`:
```hcl
variable "ecs_task_count" {
  type        = number
  default     = 1
  description = "Number of Fargate task instances for the Consolidated Web/API Service"
}

variable "ecs_task_cpu" {
  type        = string
  default     = "1024" # Combined vCPU (1.0 vCPU)
  description = "vCPU allocation for the combined ECS task (in CPU units)"
}

variable "ecs_task_memory" {
  type        = string
  default     = "2048" # Combined memory (2 GB RAM)
  description = "Memory allocation for the combined ECS task (in MB)"
}

variable "rds_instance_class" {
  type        = string
  default     = "db.t4g.micro"
  description = "Database instance class for RDS Postgres"
}

variable "redis_node_type" {
  type        = string
  default     = "cache.t4g.micro"
  description = "Node type for ElastiCache Redis cluster"
}
```

### 2. Parameterizing Infrastructure Resources
These variables will be mapped to the corresponding resource definitions in our `.tf` scripts:

* **In `ecs.tf`**:
  * Set `cpu = var.ecs_task_cpu` and `memory = var.ecs_task_memory` in the combined `web` task definition.
  * Set `desired_count = var.ecs_task_count` in the `web` ECS service.
* **In `rds.tf`**:
  * Set `instance_class = var.rds_instance_class` in the Postgres database instance.
* **In `elasticache.tf`**:
  * Set `node_type = var.redis_node_type` in the Redis cache cluster.

### 3. Quick Scaling Example
To scale the staging environment to high capacity (e.g. 3 tasks with 2 vCPUs/4GB RAM each, and a `db.t4g.medium` database instance), you only need to override the values in `staging.tfvars`:
```hcl
ecs_task_count     = 3
ecs_task_cpu       = "2048"
ecs_task_memory    = "4096"
rds_instance_class = "db.t4g.medium"
```
Applying this will execute a zero-downtime rolling update on Fargate and upscale the database instance in-place.

---

## 7. Verification Plan

### Automated Testing
* **Spring Event Tests**: Rewrite `ActivityLogPublisherTest` and add `EmailSendEventTest` to verify that publishing events correctly fires their respective listeners asynchronously, and that data is persisted/sent.
* **Transaction Rollback Test**: Add a test verifying that when a database transaction rolls back, `@TransactionalEventListener` does NOT dispatch the event (e.g., email is not sent).
* **MDC Trace Verification Test**: Verify that the correlation ID is propagated correctly into the SLF4J MDC context of the async execution thread.
* **Maven Build**: Verify the merged `/api` project builds cleanly: `mvn clean install`.
* **Terraform Validation**: Run `terraform validate` inside `infra/terraform/`.

### Manual Verification
* Run `docker compose up --build` locally. Create an event, verify that an activity log is persisted to the database, and verify that the invitation email is captured by the local `maildev` service at `http://localhost:1080`.
* Verify that the logs show no RabbitMQ auto-configuration logs, and instead list successful Spring async thread initializations and MDC correlation ID logs matching the HTTP request thread.
