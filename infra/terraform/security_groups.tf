# ALB Security Group (Allows public access to the web app)
resource "aws_security_group" "alb" {
  name        = "planohi-alb-sg-${var.environment}"
  description = "Allow TLS/HTTP inbound traffic to ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS Security Group (Allows incoming traffic only from the Load Balancer)
resource "aws_security_group" "ecs" {
  name        = "planohi-ecs-sg-${var.environment}"
  description = "Control traffic entering containers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow web app port from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "Allow internal API port from containers in this security group"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    self        = true
  }

  egress {
    description = "Allow outbound to internet (downloads, API calls)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Database Security Group (Only allows Postgres access from containers)
resource "aws_security_group" "db" {
  name   = "planohi-db-sg-${var.environment}"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "Allow Postgres port from ECS containers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Cache Security Group (Only allows Redis access from containers)
resource "aws_security_group" "redis" {
  name   = "planohi-redis-sg-${var.environment}"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "Allow Redis port from ECS containers"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

