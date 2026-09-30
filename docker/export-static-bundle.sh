#!/usr/bin/env bash
# Export the static application bundle from a built frontend image (F-9).
#
#   docker/export-static-bundle.sh export <image> <out-dir>
#   docker/export-static-bundle.sh verify <image> <dir>
#
# Production serves the applications from a static origin instead of this image.
# The files published there must be exactly the files the image serves on staging,
# so they are copied OUT of the image (by digest, ideally: <repo>@sha256:...) and
# never rebuilt. There is no separate production build.
#
# export: copies /usr/share/nginx/apps from the image into <out-dir>/<app>/..., minus
#         the precompressed .gz twins (the edge compresses), and writes
#         <out-dir>/SHA256SUMS over every exported file plus <out-dir>/SOURCE_IMAGE
#         (the image reference and its local image ID).
# verify: exits 0 only if <dir> holds exactly the image's files (same list, same
#         bytes), per a fresh export of <image>. Run it on the bundle before publishing.
set -euo pipefail

usage() { sed -n '2,18p' "$0" >&2; exit 2; }
[ $# -eq 3 ] || usage
mode=$1 image=$2 dir=$3
APPS_DIR=/usr/share/nginx/apps

extract() { # image dest
  local cid
  cid=$(docker create "$1")
  # shellcheck disable=SC2064
  trap "docker rm -f $cid >/dev/null 2>&1 || true" RETURN
  mkdir -p "$2"
  docker cp "$cid:$APPS_DIR/." "$2"
  find "$2" -type f -name '*.gz' -delete
}

sums() { # dir -> SHA256SUMS content on stdout, sorted, relative paths
  (cd "$1" && find . -type f ! -name SHA256SUMS ! -name SOURCE_IMAGE -print0 \
    | LC_ALL=C sort -z | xargs -0 shasum -a 256)
}

case "$mode" in
  export)
    [ ! -e "$dir" ] || [ -z "$(ls -A "$dir")" ] || { echo "$dir is not empty" >&2; exit 1; }
    extract "$image" "$dir"
    sums "$dir" > "$dir/SHA256SUMS"
    printf '%s\n%s\n' "$image" "$(docker image inspect -f '{{.Id}}' "$image")" > "$dir/SOURCE_IMAGE"
    echo "exported $(wc -l < "$dir/SHA256SUMS" | tr -d ' ') files from $image to $dir"
    ;;
  verify)
    [ -d "$dir" ] || { echo "no directory $dir" >&2; exit 1; }
    tmp=$(mktemp -d)
    trap 'rm -rf "$tmp"' EXIT
    extract "$image" "$tmp/image"
    if diff <(sums "$tmp/image") <(sums "$dir") >"$tmp/diff"; then
      echo "verified: $dir holds exactly the files of $image"
    else
      echo "MISMATCH between $dir and $image:" >&2
      head -40 "$tmp/diff" >&2
      exit 1
    fi
    ;;
  *) usage ;;
esac
