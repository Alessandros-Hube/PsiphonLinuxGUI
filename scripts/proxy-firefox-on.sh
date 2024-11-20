#!/bin/bash

# Function for writing the user.js file
write_user_js() {
    local profile_dir=$1
    cat <<EOL > "$profile_dir/user.js"
user_pref("network.proxy.type", 1);
user_pref("network.proxy.http", "localhost");
user_pref("network.proxy.http_port", 8081);
user_pref("network.proxy.ssl", "localhost");
user_pref("network.proxy.ssl_port", 8081);
user_pref("network.proxy.ftp", "localhost");
user_pref("network.proxy.ftp_port", 8081);
user_pref("network.proxy.socks", "localhost");
user_pref("network.proxy.socks_port", 1081);
user_pref("network.proxy.socks_version", 5);
user_pref("network.proxy.no_proxies_on", "localhost, 127.0.0.1");
EOL

# Restart Firefox if it is running
if pgrep -x "firefox" || pgrep -x "firefox-bin"; then
    pkill firefox && firefox
else
    firefox
fi

}

# Search Firefox Installation
PROFILE_DIR=$(find ~/.mozilla/firefox/ -name "*.default-release*" 2>/dev/null)
SNAP_PROFILE_DIR=$(find ~/snap/firefox/common/.mozilla/firefox/ -name "*.default*" 2>/dev/null)
FLATPAK_PROFILE_DIR=$(find ~/.var/app/org.mozilla.firefox/.mozilla/firefox/ -name "*.default-release*" 2>/dev/null)

if [ -n "$PROFILE_DIR" ]; then
    write_user_js "$PROFILE_DIR"
elif [ -n "$SNAP_PROFILE_DIR" ]; then
    write_user_js "$SNAP_PROFILE_DIR"
elif [ -n "$FLATPAK_PROFILE_DIR" ]; then
    write_user_js "$FLATPAK_PROFILE_DIR"
else
    echo "Error: Firefox is not installed." >&2  # Print error to stderr
    exit 1  # Exit with an error status
fi
