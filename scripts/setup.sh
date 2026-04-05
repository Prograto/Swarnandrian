#!/usr/bin/env bash
# ─────────────────────────────────────────
# Swarnandrian - Dev Setup Script
# ─────────────────────────────────────────

set -e

echo "🎓 Setting up Swarnandrian Platform..."

# Check .env
if [ ! -f .env ]; then
  echo "📋 Creating .env from example..."
  cp .env.example .env
  echo "⚠️  Edit .env with your MongoDB Atlas URL before starting!"
  echo ""
fi

# Pull Docker images
echo "🐳 Pulling Docker images..."
docker pull python:3.11-alpine
docker pull gcc:13-alpine
docker pull openjdk:21-alpine
docker pull node:20-alpine

echo "🚀 Building and starting all services..."
docker-compose up --build -d

echo ""
echo "✅ Swarnandrian is running!"
echo ""
echo "   🌐 Frontend:  http://localhost:3000"
echo "   📡 API:       http://localhost:8000/api/docs"
echo "   🔧 Code API:  http://localhost:8001"
echo ""
echo "📝 To view logs: docker-compose logs -f"
echo "🛑 To stop:     docker-compose down"
