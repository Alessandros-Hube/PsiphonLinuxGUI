#!/usr/bin/env bash

HTTP_PROXY="127.0.0.1:8081"
INTERVAL=3   # seconds

check_http() {
    curl -x "http://$HTTP_PROXY" \
        --connect-timeout 3 \
        -k \
        -s -o /dev/null -w "%{http_code}" \
        https://example.com | grep -q "^[23]"
}

check_device_network() {
    curl --noproxy '*' \
        --connect-timeout 3 \
        -s -o /dev/null -w "%{http_code}" \
        https://connectivitycheck.gstatic.com/generate_204 | grep -q "^204$"
}

while true; do
  if check_http; then
    HTTP="OK"
  else
    HTTP="DOWN"
  fi

  if check_device_network; then
    DEVICE="OK"
  else
    DEVICE="DOWN"
  fi

  echo "HTTP:$HTTP; DEVICE:$DEVICE"
  sleep "$INTERVAL"
done
