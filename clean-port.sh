#!/bin/bash

# Port Cleanup Script for pyAux
# Kills any process using port 5001 (Flask default)

PORT=${1:-5001}  # Default to 5001, or use first argument

echo "🧹 Cleaning port $PORT..."

# Check if port is in use
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "⚠️  Port $PORT is in use by process(es):"
    lsof -i:$PORT | grep LISTEN
    echo ""
    echo "Killing process(es)..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    sleep 1
    
    # Verify port is now free
    if lsof -ti:$PORT > /dev/null 2>&1; then
        echo "❌ Failed to free port $PORT"
        echo "Try manually: lsof -ti:$PORT | xargs kill -9"
        exit 1
    else
        echo "✅ Port $PORT is now available"
    fi
else
    echo "✅ Port $PORT is already available (nothing to clean)"
fi
