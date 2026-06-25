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

# Get script directory to locate the terraform folder relative to the script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location "$ScriptDir/terraform"

try {
    # 2. Switch/Reconfigure the backend state
    Write-Host "Reconfiguring Terraform backend state for '$EnvName'..." -ForegroundColor Green
    terraform init -backend-config="backend-$EnvName.tfvars" -reconfigure

    # 3. Execute the action
    if ($Action -eq "plan") {
        terraform plan -var-file="$EnvName.tfvars" -out="$EnvName.tfplan"
    } elseif ($Action -eq "apply") {
        if (Test-Path "$EnvName.tfplan") {
            Write-Host "Found plan file '$EnvName.tfplan'. Applying saved plan..." -ForegroundColor Cyan
            terraform apply "$EnvName.tfplan"
        } else {
            Write-Host "No plan file found. Running apply with variable file..." -ForegroundColor Yellow
            terraform apply -var-file="$EnvName.tfvars"
        }
    } elseif ($Action -eq "destroy") {
        terraform destroy -var-file="$EnvName.tfvars"
    }
}
finally {
    Pop-Location
}
