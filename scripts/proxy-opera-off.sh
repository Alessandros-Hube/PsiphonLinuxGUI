#!/bin/bash

# Check if Opera is installed natively (AUR version)
if command -v opera &> /dev/null
then
    EDGE_COMMAND="opera"
    echo "Opera (AUR) found."

# Check if Opera is installed natively (.Deb version)
elif command -v opera &> /dev/null
then
    EDGE_COMMAND="opera"
    echo "Opera (.Deb) found."

# Check if Opera is installed as a Flatpak
elif flatpak list | grep -q com.opera.Opera
then
    EDGE_COMMAND="flatpak run com.opera.Opera"
    echo "Opera (Flatpak) found."

# Check if Opera is installed as a Snap package
elif snap list | grep -q "opera"
then
    EDGE_COMMAND="snap run opera"
    echo "Opera (Snap) found."

else
    echo "Error: Opera is not installed.">&2  # Print error to stderr
    exit 1  # Exit with an error status
fi

# Terminate any running instances of Opera
if pgrep -x "opera" &> /dev/null || pgrep -f "com.opera.Opera" &> /dev/null
then
    echo "Terminating running Opera instances..."
    pkill -x "opera" 2> /dev/null
    pkill -x "opera" 2> /dev/null
    sleep 2  # Wait to ensure opera has closed properly
else
    echo "No running Opera instances found."
fi

# Start Opera
echo "Starting Opera..."
$EDGE_COMMAND &
