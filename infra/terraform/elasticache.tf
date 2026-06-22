# Subnet group for Redis cluster
resource "aws_elasticache_subnet_group" "redis" {
  name       = "planohi-redis-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
}

# Redis Serverless Cache Resource
resource "aws_elasticache_serverless_cache" "redis" {
  name                 = "planohi-cache-${var.environment}"
  engine               = "redis"
  major_engine_version = "7"

  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.redis.id]

  cache_usage_limits {
    data_storage {
      maximum = 5 # limit to 5 GB storage to keep costs down
      unit    = "GB"
    }
  }
}
