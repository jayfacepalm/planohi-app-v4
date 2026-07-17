# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "planohi-cluster-${var.environment}"
}

# Create ECR Repositories for Docker Images
resource "aws_ecr_repository" "web" {
  name                 = "planohi-web-${var.environment}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}

resource "aws_ecr_repository" "api" {
  name                 = "planohi-api-${var.environment}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}

# ECS IAM Task Execution Role (Allows ECS to pull images from ECR, send logs, and fetch Secrets)
resource "aws_iam_role" "ecs_execution" {
  name = "planohi-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Attach permissions to allow ECS task execution to retrieve Secrets Manager secrets
resource "aws_iam_policy" "ecs_execution_secrets" {
  name        = "planohi-ecs-execution-secrets-${var.environment}"
  description = "Allows the task execution role to read values from secrets manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [aws_secretsmanager_secret.app_secrets.arn]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_secrets" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = aws_iam_policy.ecs_execution_secrets.arn
}

# ECS IAM Task Role (Allows container running code to write to S3 or send SES mails)
resource "aws_iam_role" "ecs_task" {
  name = "planohi-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# Add IAM permissions for S3 & SES
resource "aws_iam_policy" "ecs_task_policy" {
  name = "planohi-ecs-task-policy-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:*"]
        Resource = ["${aws_s3_bucket.banners.arn}", "${aws_s3_bucket.banners.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_attach" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_task_policy.arn
}

# CloudWatch Log Group for Logs aggregation
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/planohi-${var.environment}"
  retention_in_days = 7
}

# ----------------- Consolidated Web/API Service -----------------
resource "aws_ecs_task_definition" "web" {
  family                   = "planohi-web-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "web"
      image     = "${aws_ecr_repository.web.repository_url}:latest"
      essential = true
      portMappings = [{
        name          = "web-port"
        containerPort = 3000
        hostPort      = 3000
      }]
      environment = [
        { name = "BACKEND_API_URL", value = "http://localhost:8080" },
        { name = "NEXT_PUBLIC_API_URL", value = "/api/proxy" },
        { name = "CSP_ALLOWED_IMAGE_SOURCES", value = "'self' data: blob: https://${aws_s3_bucket.banners.bucket_regional_domain_name} https://s3.amazonaws.com https://*.s3.amazonaws.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.googlesyndication.com https://*.doubleclick.net" },
        { name = "CSP_ALLOWED_CONNECT_SOURCES", value = "'self' ws: wss: https://pagead2.googlesyndication.com https://*.adtrafficquality.google https://*.googlesyndication.com https://*.doubleclick.net" }
      ]
      secrets = [
        {
          name      = "SECURITY_API_KEY"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:security_api_key::"
        },
        {
          name      = "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:google_client_id::"
        },
        {
          name      = "ADSENSE_PUBLISHER_ID"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:adsense_publisher_id::"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "web"
        }
      }
    },
    {
      name      = "api"
      image     = "${aws_ecr_repository.api.repository_url}:latest"
      essential = true
      portMappings = [{
        name          = "api-port"
        containerPort = 8080
        hostPort      = 8080
      }]
      environment = [
        { name = "SPRING_PROFILES_ACTIVE", value = "${var.environment}" },
        { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://${aws_db_instance.postgres.endpoint}/${var.db_name}" },
        { name = "SPRING_DATASOURCE_USERNAME", value = var.db_username },
        { name = "SPRING_DATA_REDIS_HOST", value = aws_elasticache_cluster.redis.cache_nodes[0].address },
        { name = "SPRING_DATA_REDIS_PORT", value = "6379" },
        { name = "SPRING_DATA_REDIS_SSL_ENABLED", value = "false" },
        { name = "AWS_S3_BUCKET_NAME", value = aws_s3_bucket.banners.id },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "APP_FRONTEND_URL", value = "http://localhost:3000" },
        { name = "SPRING_MAIL_HOST", value = "email-smtp.${var.aws_region}.amazonaws.com" },
        { name = "SPRING_MAIL_PORT", value = "587" },
        { name = "SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH", value = "true" },
        { name = "SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE", value = "true" }
      ]
      secrets = [
        {
          name      = "SPRING_DATASOURCE_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:db_password::"
        },
        {
          name      = "SECURITY_JWT_SECRET_KEY"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:jwt_secret_key::"
        },
        {
          name      = "SECURITY_JWT_ROLE_SECRET_KEY"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:jwt_role_secret_key::"
        },
        {
          name      = "SECURITY_API_KEY"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:security_api_key::"
        },
        {
          name      = "SPRING_MAIL_USERNAME"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:mail_username::"
        },
        {
          name      = "SPRING_MAIL_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:mail_password::"
        },
        {
          name      = "SPRING_MAIL_FROM_ADDRESS"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:mail_from_address::"
        },
        {
          name      = "GOOGLE_CLIENT_ID"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:google_client_id::"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "web" {
  name            = "web"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = var.ecs_task_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]
}

