#!/bin/bash

# Test pyAux Installation and Setup
# This script verifies everything is configured correctly

echo "🔍 pyAux Installation Test"
echo "=========================="
echo ""

# Colour codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

success_count=0
failure_count=0

# Test 1: Check Python version
echo "1. Checking Python version..."
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version)
    echo -e "${GREEN}✓${NC} Python found: $python_version"
    ((success_count++))
else
    echo -e "${RED}✗${NC} Python 3 not found. Please install Python 3.8+"
    ((failure_count++))
fi
echo ""

# Test 2: Check if .env file exists
echo "2. Checking .env file..."
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} .env file found"
    
    # Check if credentials are set
    if grep -q "your_client_id_here\|your_spotify_client_id" .env; then
        echo -e "${YELLOW}⚠${NC}  Warning: Please update .env with your Spotify credentials"
    else
        echo -e "${GREEN}✓${NC} Credentials appear to be configured"
    fi
    ((success_count++))
else
    echo -e "${RED}✗${NC} .env file not found"
    echo "   Run ./run-web.sh to create a template"
    ((failure_count++))
fi
echo ""

# Test 3: Check if requirements.txt exists
echo "3. Checking requirements.txt..."
if [ -f requirements.txt ]; then
    echo -e "${GREEN}✓${NC} requirements.txt found"
    ((success_count++))
else
    echo -e "${RED}✗${NC} requirements.txt not found"
    ((failure_count++))
fi
echo ""

# Test 4: Check if Flask is installed
echo "4. Checking Flask installation..."
if python3 -c "import flask" 2>/dev/null; then
    flask_version=$(python3 -c "import flask; print(flask.__version__)")
    echo -e "${GREEN}✓${NC} Flask installed: v$flask_version"
    ((success_count++))
else
    echo -e "${YELLOW}⚠${NC}  Flask not installed"
    echo "   Run: pip install -r requirements.txt"
    ((failure_count++))
fi
echo ""

# Test 5: Check if Spotipy is installed
echo "5. Checking Spotipy installation..."
if python3 -c "import spotipy" 2>/dev/null; then
    spotipy_version=$(python3 -c "import spotipy; print(spotipy.__version__)")
    echo -e "${GREEN}✓${NC} Spotipy installed: v$spotipy_version"
    ((success_count++))
else
    echo -e "${YELLOW}⚠${NC}  Spotipy not installed"
    echo "   Run: pip install -r requirements.txt"
    ((failure_count++))
fi
echo ""

# Test 6: Check if python-dotenv is installed
echo "6. Checking python-dotenv installation..."
if python3 -c "import dotenv" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} python-dotenv installed"
    ((success_count++))
else
    echo -e "${YELLOW}⚠${NC}  python-dotenv not installed"
    echo "   Run: pip install -r requirements.txt"
    ((failure_count++))
fi
echo ""

# Test 7: Check file structure
echo "7. Checking file structure..."
required_files=(
    "app.py"
    "templates/index.html"
    "templates/results.html"
    "static/css/style.css"
    "static/js/main.js"
)

all_files_exist=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "   ${GREEN}✓${NC} $file"
    else
        echo -e "   ${RED}✗${NC} $file missing"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = true ]; then
    ((success_count++))
else
    ((failure_count++))
fi
echo ""

# Test 8: Check port availability
echo "8. Checking if port 5000 is available..."
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}  Port 5000 is already in use"
    echo "   You may need to stop the running service or change the port in app.py"
else
    echo -e "${GREEN}✓${NC} Port 5000 is available"
    ((success_count++))
fi
echo ""

# Summary
echo "=========================="
echo "📊 Test Summary"
echo "=========================="
echo -e "${GREEN}Passed:${NC} $success_count"
echo -e "${RED}Failed:${NC} $failure_count"
echo ""

if [ $failure_count -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "You're ready to run pyAux:"
    echo "  ./run-web.sh"
    echo "  OR"
    echo "  python3 app.py"
    echo ""
    echo "Then open: http://localhost:5000"
else
    echo -e "${YELLOW}⚠️  Some tests failed${NC}"
    echo ""
    echo "Please fix the issues above before running pyAux."
    echo ""
    echo "Quick fixes:"
    echo "  1. Install dependencies: pip install -r requirements.txt"
    echo "  2. Configure .env file with your Spotify credentials"
    echo "  3. Run ./run-web.sh for automatic setup"
fi
echo ""
