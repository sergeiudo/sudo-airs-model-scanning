#!/bin/bash
#
# Prisma AIRS Model Security SDK Setup Script
# This script creates a virtual environment, installs dependencies,
# and installs the model-security-client SDK after credentials are configured.
#

set -e

echo "==================================="
echo "Prisma AIRS SDK Installation Script"
echo "==================================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found!"
    echo ""
    echo "Please copy .env.template to .env and fill in your credentials:"
    echo "  cp .env.template .env"
    echo "  nano .env  # or use your preferred editor"
    echo ""
    exit 1
fi

# Source the .env file
echo "Loading credentials from .env..."
export $(grep -v '^#' .env | xargs)

# Verify required variables are set
if [ -z "$MODEL_SECURITY_CLIENT_ID" ] || [ -z "$MODEL_SECURITY_CLIENT_SECRET" ] || [ -z "$TSG_ID" ]; then
    echo "Error: Required credentials not found in .env file"
    echo ""
    echo "Please ensure .env contains:"
    echo "  - MODEL_SECURITY_CLIENT_ID"
    echo "  - MODEL_SECURITY_CLIENT_SECRET"
    echo "  - TSG_ID"
    echo ""
    exit 1
fi

echo "Credentials loaded successfully"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment (.venv)..."
    python3 -m venv .venv
    echo "Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install base dependencies
echo "Installing base dependencies from requirements.txt..."
pip install -r requirements.txt --quiet
echo "Base dependencies installed"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Warning: 'jq' is not installed. Installing..."
    if command -v dnf &> /dev/null; then
        sudo dnf install -y jq
    elif command -v apt-get &> /dev/null; then
        sudo apt-get install -y jq
    elif command -v brew &> /dev/null; then
        brew install jq
    else
        echo "Error: Could not install jq. Please install it manually."
        exit 1
    fi
fi

# Get PyPI URL
echo "Authenticating with Prisma AIRS..."
PYPI_URL=$(./get-pypi-url.sh)

if [ -z "$PYPI_URL" ]; then
    echo "Error: Failed to get PyPI URL"
    exit 1
fi

echo "Authentication successful"
echo ""

# Install the SDK
echo "Installing model-security-client SDK..."
pip install model-security-client --extra-index-url "$PYPI_URL"

echo ""
echo "Installation complete!"
echo ""
echo "To activate the virtual environment in future sessions:"
echo "  source .venv/bin/activate"
echo ""
echo "To test the installation:"
echo "  python -c 'from model_security_client.api import ModelSecurityAPIClient; print(\"SDK imported successfully\")'"
echo ""
echo "To launch Jupyter:"
echo "  jupyter notebook"
echo ""
