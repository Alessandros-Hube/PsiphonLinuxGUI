#!/bin/bash

# Check if Edge is installed natively (AUR version)
if command -v microsoft-edge-stable &> /dev/null
then
    EDGE_COMMAND="microsoft-edge-stable"
    echo "Microsoft Edge (AUR) found."

# Check if Edge is installed natively (.Deb version)
elif command -v msedge &> /dev/null
then
    EDGE_COMMAND="msedge"
    echo "Microsoft Edge (.Deb) found."

# Check if Edge is installed as a Flatpak
elif flatpak list | grep -q com.microsoft.Edge
then
    EDGE_COMMAND="flatpak run com.microsoft.Edge"
    echo "Microsoft Edge (Flatpak) found."

# Check if Microsoft Edge is installed as a Snap package
elif snap list | grep -q "microsoft-edge"
then
    EDGE_COMMAND="snap run microsoft-edge"
    echo "Microsoft Edge (Snap) found."

else
    echo "Error: Microsoft Edge is not installed.">&2  # Print error to stderr
    exit 1  # Exit with an error status
fi

# Terminate any running instances of Microsoft Edge
if pgrep -x "msedge" &> /dev/null || pgrep -f "com.microsoft.Edge" &> /dev/null
then
    echo "Terminating running Edge instances..."
    pkill -x "msedge" 2> /dev/null
    pkill -x "msedge" 2> /dev/null
    sleep 2  # Wait to ensure Edge has closed properly
else
    echo "No running Edge instances found."
fi

# Start Edge
echo "Starting Microsoft Edge..."
$EDGE_COMMAND &
