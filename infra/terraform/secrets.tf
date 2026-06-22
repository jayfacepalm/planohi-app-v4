# Create the secret configuration
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "planohi-app-secrets-${var.environment}"
  description             = "Encrypted application passwords and keys for planohi"
  recovery_window_in_days = 0 # Allows immediate cleanup during testing / teardown
}

# Add the sensitive parameters inside a JSON string
resource "aws_secretsmanager_secret_version" "app_secrets_val" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    db_password         = var.db_password
    rabbitmq_password   = var.rabbitmq_password
    jwt_secret_key      = var.jwt_secret_key
    jwt_role_secret_key = var.jwt_role_secret_key
    security_api_key    = var.security_api_key
  })
}
