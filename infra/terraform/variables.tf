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

variable "rabbitmq_username" {
  type        = string
  sensitive   = true
  description = "RabbitMQ broker administrator username"
}

variable "rabbitmq_password" {
  type        = string
  sensitive   = true
  description = "RabbitMQ broker administrator password (must be 12+ chars, no special chars except subset)"
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
