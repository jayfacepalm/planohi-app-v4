#!/bin/sh
echo "Initializing local S3 buckets in LocalStack..."
awslocal s3 mb s3://planohi-banners
echo "Local S3 buckets initialized successfully."
