# Define database subnet group (spreads DB network layer across AZs for resilience)
resource "aws_db_subnet_group" "db" {
  name       = "planohi-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "planohi-db-subnet-group"
  }
}

# Spin up Postgres 16 Engine DB Instance
resource "aws_db_instance" "postgres" {
  identifier             = "planohi-db-${var.environment}"
  allocated_storage      = 20
  max_allocated_storage  = 100
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.rds_instance_class
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db.id]
  backup_retention_period = var.db_backup_retention_period
  storage_encrypted      = true
  skip_final_snapshot    = var.environment == "prod" ? false : true
  deletion_protection    = var.environment == "prod" ? true : false
}
