# Prelegal Windows Stop Script
Write-Host "Stopping Prelegal application..." -ForegroundColor Yellow

# Stop all services
docker-compose down

Write-Host "Prelegal application stopped!" -ForegroundColor Green

# Optional: To remove volumes, use: docker-compose down -v
