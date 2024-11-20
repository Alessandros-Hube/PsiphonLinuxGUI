#!/bin/bash

# Check if Chrome is installed natively (AUR version)
if command -v google-chrome-stable &> /dev/null
then
    EDGE_COMMAND="google-chrome-stable"
    echo "Google Chrome (AUR) found."

# Check if Chrome is installed natively (.Deb version)
elif command -v google-chrome &> /dev/null
then
    EDGE_COMMAND="chrome"
    echo "Google Chrome (.Deb) found."

# Check if Chrome is installed as a Flatpak
elif flatpak list | grep -q com.google.Chrome
then
    EDGE_COMMAND="flatpak run com.google.Chrome"
    echo "Google Chrome (Flatpak) found."

# Check if Chrome is installed as a Snap package
elif snap list | grep -q "chromium"
then
    EDGE_COMMAND="snap run chromium"
    echo "Google Chrome (Snap) found."

else
    echo "Error: Google Chrome is not installed.">&2  # Print error to stderr
    exit 1  # Exit with an error status
fi

# Terminate any running instances of Google Chrome
if pgrep -x "chrome" &> /dev/null || pgrep -f "com.google.Chrome" &> /dev/null
then
    echo "Terminating running Chrome instances..."
    pkill -x "chrome" 2> /dev/null
    pkill -x "chrome" 2> /dev/null
    sleep 2  # Wait to ensure Chrome has closed properly
else
    echo "No running Chrome instances found."
fi

# Start Chrome
echo "Starting Google Chrome..."
$EDGE_COMMAND &
