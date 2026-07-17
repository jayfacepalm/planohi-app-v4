variable "aws_region" {
  type        = string
  sensitive   = true
  description = "AWS region where resources will be created"
}

variable "environment" {
  type        = string
  sensitive   = true
  description = "Deployment environment name (e.g. dev, staging, prod)"
}

variable "domain_name" {
  type        = string
  description = "The root domain name for the application"
  default     = "planohi.local"
}

variable "db_name" {
  type        = string
  sensitive   = true
  description = "Database name"
}

variable "db_username" {
  type        = string
  sensitive   = true
  description = "Database administrator username"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "Database administrator password"
}

variable "db_backup_retention_period" {
  type        = number
  default     = 7
  description = "The number of days to retain automated database backups. Set to 0 to disable backups."
}

variable "ecs_task_count" {
  type        = number
  default     = 1
  description = "Number of Fargate task instances for the Consolidated Web/API Service"
}

variable "ecs_task_cpu" {
  type        = string
  default     = "1024"
  description = "vCPU allocation for the combined ECS task (in CPU units)"
}

variable "ecs_task_memory" {
  type        = string
  default     = "2048"
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

variable "jwt_secret_key" {
  type        = string
  sensitive   = true
  description = "Secret key for signing JWT tokens"
}

variable "jwt_role_secret_key" {
  type        = string
  sensitive   = true
  description = "Secret key for signing JWT user roles"
}

variable "security_api_key" {
  type        = string
  sensitive   = true
  description = "API key used to authenticate internal system integrations"
}

variable "mail_username" {
  type        = string
  sensitive   = true
  description = "SMTP username for sending emails"
  default     = ""
}

variable "mail_password" {
  type        = string
  sensitive   = true
  description = "SMTP password for sending emails"
  default     = ""
}

variable "mail_from_address" {
  type        = string
  description = "The email address to send emails from (must be verified in SES)"
  sensitive   = true
}

variable "google_client_id" {
  type        = string
  sensitive   = true
  description = "Google Client ID for OAuth login"
}

variable "adsense_publisher_id" {
  type        = string
  sensitive   = true
  description = "Google AdSense Publisher ID (e.g. pub-1595992491270463)"
  default     = "pub-0000000000000000"
}

variable "acm_certificate_arn" {
  type        = string
  description = "ACM Certificate ARN for the custom domain in N. Virginia (us-east-1)"
  default     = ""
}

