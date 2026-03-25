#!/bin/bash

# pyAux Web Application Launcher
# This script helps you set up and run the Flask web application

# Change to the script's directory so relative paths work
cd "$(dirname "$0")"

echo "🎵 pyAux - Spotify Playlist Analyser"
echo "===================================="
echo ""

# Function to clean up port 5001
clean_port() {
    local PORT=5001
    echo "🧹 Checking port $PORT..."
    
    # Check if port is in use
    if lsof -ti:$PORT > /dev/null 2>&1; then
        echo "⚠️  Port $PORT is in use. Cleaning up..."
        lsof -ti:$PORT | xargs kill -9 2>/dev/null
        sleep 1
        
        # Verify port is now free
        if lsof -ti:$PORT > /dev/null 2>&1; then
            echo "❌ Failed to free port $PORT. Please manually stop the process."
            exit 1
        else
            echo "✅ Port $PORT is now available"
        fi
    else
        echo "✅ Port $PORT is available"
    fi
    echo ""
}

# Clean port before starting
clean_port

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo "Creating a template .env file..."
    echo ""
    cat > .env << EOF
# Spotify API Credentials
# Get these from: https://developer.spotify.com/dashboard
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here

# Flask Secret Key (generate a random string)
FLASK_SECRET_KEY=dev-secret-key-change-in-production
EOF
    echo "✅ Created .env file"
    echo "📝 Please edit the .env file with your Spotify API credentials"
    echo ""
    echo "To get Spotify credentials:"
    echo "1. Visit https://developer.spotify.com/dashboard"
    echo "2. Create a new app"
    echo "3. Copy your Client ID and Client Secret into the .env file"
    echo ""
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Check if requirements are installed
if ! python -c "import flask" 2>/dev/null; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
    echo "✅ Dependencies installed"
    echo ""
fi

# Run the Flask application
echo "🚀 Starting Flask application..."
echo "📱 Open your browser and visit: http://localhost:5000"
echo "⏹️  Press Ctrl+C to stop the server"
echo ""

python app.py
