# Random suffix generator so our S3 bucket has a unique global name
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 Bucket for Banners
resource "aws_s3_bucket" "banners" {
  bucket        = "planohi-banners-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment == "prod" ? false : true
}

# Disable public block rules so public reads are possible if using public assets
resource "aws_s3_bucket_public_access_block" "banners_access" {
  bucket = aws_s3_bucket.banners.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket CORS configuration (allows Next.js / Browser direct requests)
resource "aws_s3_bucket_cors_configuration" "banners_cors" {
  bucket = aws_s3_bucket.banners.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}
