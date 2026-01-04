#!/usr/bin/env pwsh
# Build script for Solana program using Docker
# This avoids Windows toolchain issues

param(
    [switch]$Deploy,
    [string]$Cluster = "devnet"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🔨 Building Solana Agent Registry Program..." -ForegroundColor Cyan
Write-Host ""

# Check Docker is available
try {
    docker --version | Out-Null
} catch {
    Write-Host "❌ Docker is not installed or not running." -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Create output directory
$OutputDir = Join-Path $ProjectRoot "target" "deploy"
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
}

Write-Host "📦 Building with Docker (anchor v0.30.1)..." -ForegroundColor Yellow

# Build using Docker
docker run --rm `
    -v "${ProjectRoot}:/workspace" `
    -w /workspace `
    backpackapp/build:v0.30.1 `
    anchor build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build successful!" -ForegroundColor Green

# Check for output
$ProgramSo = Join-Path $OutputDir "agent_registry.so"
if (Test-Path $ProgramSo) {
    $Size = (Get-Item $ProgramSo).Length / 1KB
    Write-Host "📄 Program: $ProgramSo ($([math]::Round($Size, 2)) KB)" -ForegroundColor Cyan
} else {
    Write-Host "⚠️ Program file not found at expected location" -ForegroundColor Yellow
}

# Deploy if requested
if ($Deploy) {
    Write-Host ""
    Write-Host "🚀 Deploying to $Cluster..." -ForegroundColor Yellow
    
    solana config set --url $Cluster
    
    # Deploy
    solana program deploy $ProgramSo
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Deploy: solana program deploy target/deploy/agent_registry.so"
Write-Host "  2. Or run: .\build.ps1 -Deploy -Cluster devnet"
Write-Host ""
