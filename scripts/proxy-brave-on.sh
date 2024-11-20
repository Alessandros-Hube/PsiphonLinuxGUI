#!/bin/bash

# Proxy settings
PROXY_SERVER="http=localhost:8081;https=localhost:8081;socks=localhost:1081"

# Check if Brave is installed natively
if command -v brave &> /dev/null
then
    EDGE_COMMAND="brave"
    echo "Brave found."

# Check if Brave is installed as a Flatpak
elif flatpak list | grep -q com.brave.Browser
then
    EDGE_COMMAND="flatpak run com.brave.Browser"
    echo "Brave (Flatpak) found."

# Check if Brave is installed as a Snap package
elif snap list | grep -q "brave"
then
    EDGE_COMMAND="snap run brave"
    echo "Brave (Snap) found."

else
    echo "Error: Brave is not installed." >&2  # Print error to stderr
    exit 1  # Exit with an error status
fi

# Terminate any running instances of Brave
if pgrep -x "brave" &> /dev/null || pgrep -f "com.brave.Browser" &> /dev/null
then
    echo "Terminating running Brave instances..."
    pkill -x "brave" 2> /dev/null
    pkill -x "brave" 2> /dev/null
    sleep 2  # Wait to ensure brave has closed properly
else
    echo "No running Brave instances found."
fi

# Start Brave with proxy settings
echo "Starting Brave with proxy settings..."
$EDGE_COMMAND --proxy-server="$PROXY_SERVER" &
