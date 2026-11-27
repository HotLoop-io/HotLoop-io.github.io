#!/bin/sh
# Runs before nginx starts (nginx-unprivileged runs every /docker-entrypoint.d/*.sh). The Helm chart repositories under
# /hotloop*/ are proxied to GitHub Pages by name, and nginx only re-resolves a name when it has a resolver, so the pod's
# own DNS server goes in a file docker/nginx.conf includes.
set -eu
ns=$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf)
[ -n "$ns" ] || { echo "30-resolver: no nameserver in /etc/resolv.conf" >&2; exit 1; }
case "$ns" in *:*) ns="[$ns]" ;; esac
printf 'resolver %s valid=30s ipv6=off;\n' "$ns" > /tmp/resolver.conf
echo "30-resolver: resolver $ns"
