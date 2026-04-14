#!/bin/bash
# Wait for deployment then check health
sleep 15
echo "Checking API health..."
curl -s http://localhost:5001/api/health-check | jq . || echo "API not ready yet"
