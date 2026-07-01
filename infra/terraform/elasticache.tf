# Subnet group for Redis cluster
resource "aws_elasticache_subnet_group" "redis" {
  name       = "planohi-redis-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "planohi-cache-${var.environment}"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]

  tags = {
    Name = "planohi-redis-cluster-${var.environment}"
  }
}
