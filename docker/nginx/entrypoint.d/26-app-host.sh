#!/bin/sh
# Writes /etc/nginx/generated/app-host.conf, included in every application server
# block after the /api and /socket.io routes.
#
# SYSTEM_CONTROL_STUB  ready | off (default off)
#   /system/* is the system-control contract (status and wake). In production it
#   belongs to the infrastructure in front of this proxy and never reaches it. On
#   staging and local stacks, `ready` answers it here: the system is always READY,
#   because this host serves only when it is running.
#   Either way /system/* never falls back to index.html: an HTML answer must not be
#   mistaken for a status.
#
# STATIC_APPS  on | off (default on)
#   on:  the applications are served from this image (staging, local).
#   off: only /api, /socket.io and /system answer on the application hostnames;
#        every other path is a 404. Production serves the applications from a
#        static origin, so a request for them reaching this proxy is a mis-route
#        that must be visible, not silently answered with the image's copy.
set -eu

out=/etc/nginx/generated/app-host.conf
stub=${SYSTEM_CONTROL_STUB:-off}
static=${STATIC_APPS:-on}

case "$stub" in
    ready|off) ;;
    *) echo "$0: SYSTEM_CONTROL_STUB must be 'ready' or 'off', not '$stub'" >&2; exit 1 ;;
esac
case "$static" in
    on|off) ;;
    *) echo "$0: STATIC_APPS must be 'on' or 'off', not '$static'" >&2; exit 1 ;;
esac

{
    echo "# Generated at start-up by $0 (SYSTEM_CONTROL_STUB=$stub, STATIC_APPS=$static)."
    if [ "$stub" = ready ]; then
        cat <<'EOF'

location = /system/status {
    default_type application/json;
    add_header Cache-Control "no-store" always;
    if ($request_method !~ ^(GET|HEAD)$) {
        return 405 '{"error":"method_not_allowed"}';
    }
    return 200 '{"version":1,"state":"READY"}';
}

location = /system/wake {
    default_type application/json;
    add_header Cache-Control "no-store" always;
    if ($request_method != POST) {
        return 405 '{"error":"method_not_allowed"}';
    }
    return 202 '{"version":1,"state":"READY"}';
}
EOF
    fi
    cat <<'EOF'

location /system/ {
    default_type application/json;
    add_header Cache-Control "no-store" always;
    return 404 '{"error":"not_found"}';
}
EOF
    if [ "$static" = on ]; then
        echo
        echo "include /etc/nginx/snippets/spa.conf;"
    else
        cat <<'EOF'

location / {
    default_type application/json;
    return 404 '{"error":"not_found"}';
}
EOF
    fi
} > "$out"
echo "$0: SYSTEM_CONTROL_STUB=$stub STATIC_APPS=$static"
