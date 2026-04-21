#!/bin/bash

echo "Starting Prelegal application..."

# Build and start all services
docker-compose up -d --build

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 5

# Check if services are running
if docker ps --format '{{.Names}}' | grep -q "prelegal-backend"; then
    echo "Backend is running at http://localhost:8000"
else
    echo "Backend failed to start"
    exit 1
fi

if docker ps --format '{{.Names}}' | grep -q "prelegal-frontend"; then
    echo "Frontend is running at http://localhost:3000"
else
    echo "Frontend failed to start"
    exit 1
fi

echo "Prelegal application started successfully!"
echo ""
echo "Backend API: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Health check: http://localhost:8000/health"
