#!/usr/bin/env bash

CONFIG="$HOME/.config/psiphonlinuxgui/psiphon.config"

HTTP_PORT=$(grep -oP '"LocalHttpProxyPort"\s*:\s*\K[0-9]+' "$CONFIG")

check_port() {
    local pid process result

    # Method 1: lsof
    pid=$(lsof -ti tcp:$HTTP_PORT 2>/dev/null | head -1)

    if [ -n "$pid" ]; then
        process=$(ps -p "$pid" -o comm= 2>/dev/null)
        echo "Port $HTTP_PORT to connect to proxy server is occupied by process: $process (PID: $pid)"
        return
    fi

    # Method 2: ss as a Fallback
    result=$(ss -tlnp "sport = :$HTTP_PORT" 2>/dev/null | grep ":$HTTP_PORT")

    if [ -n "$result" ]; then
        echo "Port $HTTP_PORT to connect to proxy server is occupied"
        exit 1
    else
        echo "Port $HTTP_PORT is free"
        exit 0
    fi
}

check_port