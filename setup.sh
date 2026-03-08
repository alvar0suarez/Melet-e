#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "========================================"
echo "  Melete — First Time Setup"
echo "========================================"

echo "[1/3] Installing Python dependencies..."
pip3 install -r requirements.txt -q

echo "[2/3] Installing Node.js dependencies..."
cd ui && npm install

echo "[3/3] Building the frontend..."
npm run build
cd ..

echo ""
echo "========================================"
echo "  Setup complete!"
echo "  Run: python3 main.py"
echo "========================================"
