# Prelegal Windows Start Script
Write-Host "Starting Prelegal application..." -ForegroundColor Cyan

# Build and start all services
docker-compose up -d --build

# Wait for services to be ready
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if services are running
$backend = docker ps --format '{{.Names}}' | Select-String "prelegal-backend"
if ($backend) {
    Write-Host "Backend is running at http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "Backend failed to start" -ForegroundColor Red
    exit 1
}

$frontend = docker ps --format '{{.Names}}' | Select-String "prelegal-frontend"
if ($frontend) {
    Write-Host "Frontend is running at http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "Frontend failed to start" -ForegroundColor Red
    exit 1
}

Write-Host "`nPrelegal application started successfully!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:8000"
Write-Host "Frontend: http://localhost:3000"
Write-Host "Health check: http://localhost:8000/health"
