# Amazon MQ RabbitMQ Broker
resource "aws_mq_broker" "rabbitmq" {
  broker_name        = "planohi-rabbitmq-${var.environment}"
  engine_type        = "RabbitMQ"
  engine_version     = "3.13"
  host_instance_type = "mq.t3.micro" # Entry tier broker instance

  security_groups     = [aws_security_group.rabbitmq.id]
  subnet_ids          = [aws_subnet.private[0].id] # Single AZ configuration for dev/staging costs
  deployment_mode     = "SINGLE_INSTANCE"
  publicly_accessible = false

  user {
    username = var.rabbitmq_username
    password = var.rabbitmq_password
  }
}
