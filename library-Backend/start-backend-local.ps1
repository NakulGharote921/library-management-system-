# Starts the backend against your LOCAL MySQL database.
# NEVER loads .env (that points to the production Railway database).
# Usage:  .\start-backend-local.ps1   (run from this directory)
$ErrorActionPreference = 'Stop'

# --- Local development overrides ---
$env:SPRING_DATASOURCE_URL = 'jdbc:mysql://localhost:3306/library_dbg?zeroDateTimeBehavior=CONVERT_TO_NULL&serverTimezone=UTC&allowPublicKeyRetrieval=true&useSSL=false'
$env:SPRING_DATASOURCE_USERNAME = 'root'
$env:SPRING_DATASOURCE_PASSWORD = 'root'    # change this if your local MySQL root password differs
$env:JWT_SECRET = 'local-dev-secret-0123456789abcdef0123456789abcdef'
$env:RAZORPAY_KEY_ID = 'rzp_test_TNDP3B2d4nerAJ'
$env:RAZORPAY_KEY_SECRET = 'ZvXJ5nXcs2f3Q4uEXhLpXU0j'
$env:FRONTEND_URL = 'http://localhost:3000'

Write-Host 'Starting backend on http://localhost:8080 (local MySQL + local JWT)...' -ForegroundColor Green
& (Join-Path $PSScriptRoot 'mvnw.cmd') spring-boot:run
