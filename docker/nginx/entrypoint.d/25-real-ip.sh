#!/bin/sh
# Trust a load balancer or TLS terminator in front of this proxy.
#
# REAL_IP_TRUSTED_CIDRS: space- or comma-separated addresses/CIDRs of the proxies
# allowed to report the client address in X-Forwarded-For. Empty (the default)
# means this nginx is the edge: the TCP peer is the client and any X-Forwarded-For
# a client sends is ignored.
set -eu

out=/etc/nginx/conf.d/10-real-ip.conf
cidrs=$(printf '%s' "${REAL_IP_TRUSTED_CIDRS:-}" | tr ',' ' ')

if [ -z "$(printf '%s' "$cidrs" | tr -d ' ')" ]; then
    : > "$out"
    echo "$0: REAL_IP_TRUSTED_CIDRS empty; the TCP peer is the client"
    exit 0
fi

{
    echo "# Generated at start-up from REAL_IP_TRUSTED_CIDRS."
    for cidr in $cidrs; do
        echo "set_real_ip_from $cidr;"
    done
    echo "real_ip_header X-Forwarded-For;"
    echo "real_ip_recursive on;"
} > "$out"
echo "$0: trusting X-Forwarded-For from: $cidrs"
