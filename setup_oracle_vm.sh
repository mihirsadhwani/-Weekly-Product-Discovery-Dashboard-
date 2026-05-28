#!/bin/bash
# One-shot setup for Oracle Cloud Ubuntu ARM VM
# Run as: bash setup_oracle_vm.sh

set -e

echo "========================================"
echo " Step 1: System packages"
echo "========================================"
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv git curl unzip libglib2.0-0

echo ""
echo "========================================"
echo " Step 2: Python packages"
echo "========================================"
pip3 install playwright groq google-genai

echo ""
echo "========================================"
echo " Step 3: Playwright + Chromium"
echo "========================================"
python3 -m playwright install chromium --with-deps

echo ""
echo "========================================"
echo " Step 4: GitHub Actions runner"
echo "========================================"
mkdir -p ~/actions-runner && cd ~/actions-runner

# Download latest runner for Linux ARM64
RUNNER_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/')
curl -o actions-runner-linux-arm64.tar.gz -L \
  "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-arm64-${RUNNER_VERSION}.tar.gz"
tar xzf ./actions-runner-linux-arm64.tar.gz

echo ""
echo "========================================"
echo " DONE - one step left (30 seconds)"
echo "========================================"
echo ""
echo "1. Open this URL in your browser:"
echo "   https://github.com/mihirsadhwani/-Weekly-Product-Discovery-Dashboard-/settings/actions/runners/new"
echo ""
echo "2. Select: Linux | ARM64"
echo ""
echo "3. SKIP the Download section (already done)."
echo "   Copy only the ./config.sh line from the 'Configure' section."
echo "   It looks like:"
echo "   ./config.sh --url https://github.com/... --token YOUR_TOKEN_HERE"
echo ""
echo "4. Paste and run that command here, then run:"
echo "   sudo ./svc.sh install && sudo ./svc.sh start"
echo ""
echo "The runner will now start automatically on every reboot."
