#!/usr/bin/env bash

PORT=8081

check_port() {
    local pid process result

    # Methode 1: lsof
    pid=$(lsof -ti tcp:$PORT 2>/dev/null | head -1)

    if [ -n "$pid" ]; then
        process=$(ps -p "$pid" -o comm= 2>/dev/null)
        echo "Port $PORT to connect to proxy server is occupied by process: $process (PID: $pid)"
        return
    fi

    # Methode 2: ss als Fallback
    result=$(ss -tlnp "sport = :$PORT" 2>/dev/null | grep ":$PORT")

    if [ -n "$result" ]; then
        echo "Port $PORT to connect to proxy server is occupied"
        exit 1
    else
        echo "Port $PORT is free"
        exit 0
    fi
}

check_port