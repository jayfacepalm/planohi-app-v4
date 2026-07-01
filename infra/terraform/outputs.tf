output "alb_dns_name" {
  value       = aws_lb.external.dns_name
  description = "The public website URL of your application"
}

output "web_ecr_repo_url" {
  value       = aws_ecr_repository.web.repository_url
  description = "ECR URL for the frontend next.js image"
}

output "api_ecr_repo_url" {
  value       = aws_ecr_repository.api.repository_url
  description = "ECR URL for the backend api image"
}


