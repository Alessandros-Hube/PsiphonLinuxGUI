#!/bin/bash

# Find the path to the Psiphon .desktop file in /usr/share/applications
DESKTOP_FILE=$(find /usr/share/applications/psiphonlinuxgui.desktop)

# Check if the .desktop file was found
if [ -n "$DESKTOP_FILE" ]; then
    # Modify the Exec line in the .desktop file to add the --no-sandbox parameter
    sed -i 's|Exec=.*|& --no-sandbox|' "$DESKTOP_FILE"
    echo "The parameter '--no-sandbox' has been added to the .desktop file."
else
    # Print a message if the .desktop file was not found
    echo "The .desktop file was not found."
fi

SYMLINK="/usr/local/bin/psiphonlinuxgui"
TARGET="/opt/psiphonlinuxgui/psiphonlinuxgui"

# Check if the symbolic link exist
if [ ! -L "$SYMLINK" ]; then
    # Create a symbolic link from the Psiphon executable to /usr/local/bin
    # This allows you to run 'psiphonlinuxgui' command from anywhere in the terminal without needing the full path
    sudo ln -s "$TARGET" "$SYMLINK"
fi
