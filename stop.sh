#!/bin/bash

echo "Stopping Prelegal application..."

# Stop all services
docker-compose down

echo "Prelegal application stopped!"

# Optional: Remove volumes to clear database
# docker-compose down -v
