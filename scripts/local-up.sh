#!/usr/bin/env bash
set -eu

COMPOSE_FILE="docker-compose.clean.yml"

echo "Starting local test stack using ${COMPOSE_FILE}..."
docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans || true
docker compose -f "$COMPOSE_FILE" up -d --build

echo "Waiting for services to initialize..."
sleep 6

echo "Checking API health..."
curl -sS http://localhost:5001/api/health || { echo "health check failed"; exit 1; }

echo "Checking artifacts..."
curl -sS http://localhost:5001/api/artifacts | jq . || { echo "artifacts check failed"; exit 1; }

echo "Frontend should be available at http://localhost:3000"
