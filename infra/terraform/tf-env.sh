#!/bin/bash
set -e

ENV_NAME=$1
ACTION=$2

if [[ "$ENV_NAME" != "staging" && "$ENV_NAME" != "prod" ]]; then
  echo "Usage: ./tf-env.sh [staging|prod] [plan|apply|destroy]"
  exit 1
fi

if [[ "$ACTION" == "destroy" ]]; then
  read -p "WARNING: You are about to DESTROY the '$ENV_NAME' environment. Type the environment name to confirm: " CONFIRM_NAME
  if [[ "$CONFIRM_NAME" != "$ENV_NAME" ]]; then
    echo "Confirmation failed. Entered '$CONFIRM_NAME' does not match '$ENV_NAME'. Aborting."
    exit 1
  fi
fi

echo "Switching backend to $ENV_NAME..."
terraform init -backend-config="backend-$ENV_NAME.tfvars" -reconfigure

if [[ "$ACTION" == "plan" ]]; then
  terraform plan -var-file="$ENV_NAME.tfvars"
elif [[ "$ACTION" == "apply" ]]; then
  terraform apply -var-file="$ENV_NAME.tfvars"
elif [[ "$ACTION" == "destroy" ]]; then
  terraform destroy -var-file="$ENV_NAME.tfvars"
fi
