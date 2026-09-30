#!/usr/bin/env bash
# Container test for the application-host routing (26-app-host.sh):
# the /system stub, STATIC_APPS, and that /system/* never answers HTML.
#
#   docker/nginx/test/app-host.test.sh
#
# Builds only the Dockerfile's runtime-base stage (no Node build) and serves a
# placeholder index.html in place of the applications. Needs Docker and curl.
set -euo pipefail

cd "$(dirname "$0")/../../.."
IMAGE=managerbeyo-frontend-runtime-base:test
PORT=${APP_HOST_TEST_PORT:-18089}
FAILURES=0
CONTAINER=""

cleanup() { [ -z "$CONTAINER" ] || docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker build -q --target runtime-base -t "$IMAGE" . >/dev/null

fixture=$(mktemp -d)
mkdir -p "$fixture/floor/assets"
printf '<!doctype html><title>floor</title>\n' > "$fixture/floor/index.html"
printf 'console.log(1)\n' > "$fixture/floor/assets/app-abc123.js"
chmod -R a+rX "$fixture"

start() { # env assignments...
  cleanup
  local args=()
  for kv in "$@"; do args+=(-e "$kv"); done
  CONTAINER=$(docker run -d "${args[@]}" -e FLOOR_HOST=floor.test -e API_UPSTREAM=127.0.0.1:9 \
    -v "$fixture:/usr/share/nginx/apps:ro" -p "127.0.0.1:$PORT:8080" "$IMAGE")
  for _ in $(seq 1 50); do
    curl -fsS -o /dev/null "http://127.0.0.1:$PORT/__health" 2>/dev/null && return 0
    sleep 0.1
  done
  docker logs "$CONTAINER" >&2
  echo "container did not start" >&2
  return 1
}

# Must fail to start (bad setting).
refuses() { # env assignment
  cleanup
  CONTAINER=$(docker run -d -e "$1" "$IMAGE")
  for _ in $(seq 1 50); do
    [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER")" = false ] && break
    sleep 0.1
  done
  if [ "$(docker inspect -f '{{.State.Running}} {{.State.ExitCode}}' "$CONTAINER")" = "false 1" ]; then
    echo "ok    refuses $1"
  else
    echo "FAIL  accepted $1"; FAILURES=$((FAILURES + 1))
  fi
}

# expect METHOD PATH STATUS [BODY_SUBSTRING] [HEADER_SUBSTRING]
expect() {
  local method=$1 path=$2 status=$3 body=${4:-} header=${5:-} out hdr code
  out=$(mktemp) hdr=$(mktemp)
  local verb=(-X "$method")
  [ "$method" != HEAD ] || verb=(--head)
  code=$(curl -sS -o "$out" -D "$hdr" -w '%{http_code}' "${verb[@]}" \
    -H "Host: floor.test" "http://127.0.0.1:$PORT$path")
  local ok=1
  [ "$code" = "$status" ] || ok=0
  [ -z "$body" ] || grep -qF "$body" "$out" || ok=0
  [ -z "$header" ] || grep -qiF "$header" "$hdr" || ok=0
  # Never HTML on /system/*.
  case "$path" in /system*) ! grep -qi '<html\|<!doctype' "$out" || ok=0 ;; esac
  if [ $ok = 1 ]; then
    echo "ok    $method $path -> $code"
  else
    echo "FAIL  $method $path -> $code (want $status ${body:+body~$body} ${header:+header~$header}): $(head -c 200 "$out")"
    FAILURES=$((FAILURES + 1))
  fi
  rm -f "$out" "$hdr"
}

echo "== default (SYSTEM_CONTROL_STUB=off, STATIC_APPS=on): production-like /system"
start
expect GET  /system/status 404 '"not_found"' 'Cache-Control: no-store'
expect POST /system/wake   404 '"not_found"'
expect GET  /system/other  404 '"not_found"'
expect GET  /some/route    200 '<title>floor</title>'
expect GET  /assets/app-abc123.js 200 'console.log' 'immutable'
expect GET  /assets/missing.js 404

echo "== SYSTEM_CONTROL_STUB=ready (staging, local)"
start SYSTEM_CONTROL_STUB=ready
expect GET  /system/status 200 '{"version":1,"state":"READY"}' 'Cache-Control: no-store'
expect GET  /system/status 200 '' 'Content-Type: application/json'
expect HEAD /system/status 200
expect POST /system/wake   202 '{"version":1,"state":"READY"}' 'Cache-Control: no-store'
expect POST /system/status 405 'method_not_allowed'
expect GET  /system/wake   405 'method_not_allowed'
expect GET  /system/other  404 '"not_found"'
expect GET  /system/status/ 404 '"not_found"'
expect GET  /some/route    200 '<title>floor</title>'

echo "== STATIC_APPS=off (production origin)"
start STATIC_APPS=off
expect GET  /              404 '"not_found"'
expect GET  /index.html    404
expect GET  /assets/app-abc123.js 404
expect GET  /system/status 404 '"not_found"'
expect GET  /api/v1/health 502

echo "== invalid settings"
refuses SYSTEM_CONTROL_STUB=yes
refuses STATIC_APPS=maybe

rm -rf "$fixture"
if [ $FAILURES -gt 0 ]; then
  echo "$FAILURES check(s) failed"; exit 1
fi
echo "all checks passed"
