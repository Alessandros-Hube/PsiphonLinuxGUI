#!/bin/bash

ACTION="$1"
PSIPHON_CORE="$2" # $2 is the path to the Psiphon core executable

WORK_DIR="$HOME/.config/psiphonlinuxgui"
PSIPHON_BIN="psiphon-tunnel-core-x86_64"

if [ "$ACTION" = "start" ]; then

    if [ -n "$PSIPHON_CORE" ]; then
        # Start Psiphon-tunnel-core process
        cd "$WORK_DIR" || exit 1
        "$PSIPHON_CORE" -config psiphon.config
        exit 0
    else
        echo "Error: No PSIPHON_CORE path specified"
        exit 1
    fi

elif [ "$ACTION" = "stop" ]; then
    # Psiphon-tunnel-core process termination
    pkill -f "$PSIPHON_BIN"
    exit 0
else
    echo "Usage:"
    echo "  $0 start <path_to_psiphon_core>"
    echo "  $0 stop "
    exit 1
fi
