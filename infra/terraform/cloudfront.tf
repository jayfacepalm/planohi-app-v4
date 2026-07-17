# CloudFront Distribution in front of Application Load Balancer
resource "aws_cloudfront_distribution" "web" {
  origin {
    domain_name = aws_lb.external.dns_name
    origin_id   = "planohi-alb-${var.environment}"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront Distribution for Plano.hi app in ${var.environment}"
  aliases             = var.acm_certificate_arn != "" ? [var.domain_name] : []

  # Default Cache Behavior: Dynamic Content and APIs (Caching Disabled, forward everything)
  default_cache_behavior {
    target_origin_id       = "planohi-alb-${var.environment}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]

    # Use AWS Managed CachingDisabled Policy
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"

    # Use AWS Managed AllViewer Origin Request Policy (forwards headers, query strings, and cookies)
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }

  # Ordered Cache Behavior: Caching Optimized for Next.js Static Chunks
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = "planohi-alb-${var.environment}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    # Use AWS Managed CachingOptimized Policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # Ordered Cache Behavior: Caching Optimized for Public Static Assets
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    target_origin_id       = "planohi-alb-${var.environment}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    # Use AWS Managed CachingOptimized Policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == "" ? true : false
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : "TLSv1"
  }

  tags = {
    Name = "planohi-cloudfront-${var.environment}"
  }
}
