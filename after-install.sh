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

# Path to the configuration directory for Psiphon
CONFIG_PATH="/opt/psiphonlinuxgui/resources/app/configs"

# Check if the CONFIG_PATH variable is set (this check is always true in the current context)
if [ -n "$CONFIG_PATH" ]; then
    # Change ownership of the base.config file to root
    sudo chown root "$CONFIG_PATH"/base.config
    # Set permissions of the base.config file to 777 (read, write, and execute for all)
    sudo chmod 777 "$CONFIG_PATH"/base.config
    # Change ownership of the psiphon.config file to root
    sudo chown root "$CONFIG_PATH"/psiphon.config
    # Set permissions of the psiphon.config file to 777
    sudo chmod 777 "$CONFIG_PATH"/psiphon.config
    echo "Permissions for config folder were set to 777."
else
    # Print a message if the config directory was not found
    echo "config folder was not found under $CONFIG_PATH"
fi

# Create a symbolic link from the Psiphon executable to /usr/local/bin
# This allows you to run 'psiphonlinuxgui' command from anywhere in the terminal without needing the full path
sudo ln -s /opt/psiphonlinuxgui/psiphonlinuxgui /usr/local/bin/psiphonlinuxgui

