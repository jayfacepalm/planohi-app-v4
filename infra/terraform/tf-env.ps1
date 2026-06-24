param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("staging", "prod")]
    [string]$EnvName,

    [Parameter(Mandatory=$true)]
    [ValidateSet("apply", "destroy", "plan")]
    [string]$Action
)

# 1. Double confirmation check for destroy actions
if ($Action -eq "destroy") {
    $ConfirmName = Read-Host "WARNING: You are about to DESTROY the '$EnvName' environment! To confirm, please type the environment name"
    if ($ConfirmName -ne $EnvName) {
        Write-Error "Confirmation failed. Entered '$ConfirmName' does not match '$EnvName'. Aborting."
        exit 1
    }
    Write-Host "Confirmation matches! Proceeding to destroy..." -ForegroundColor Yellow
}

# 2. Switch/Reconfigure the backend state
Write-Host "Reconfiguring Terraform backend state for '$EnvName'..." -ForegroundColor Green
terraform init -backend-config="backend-$EnvName.tfvars" -reconfigure

# 3. Execute the action
if ($Action -eq "plan") {
    terraform plan -var-file="$EnvName.tfvars"
} elseif ($Action -eq "apply") {
    terraform apply -var-file="$EnvName.tfvars"
} elseif ($Action -eq "destroy") {
    terraform destroy -var-file="$EnvName.tfvars"
}
