#!/usr/bin/env python3
"""Publish an exported static bundle (docker/export-static-bundle.sh) to the production static origin.

  publish-static-bundle.py upload <bundle-dir> <frontend-sha> <image-ref> --bucket B
  publish-static-bundle.py switch <frontend-sha> --bucket B --kvs-arn ARN [--apps managers,workers,...]
  publish-static-bundle.py show   --kvs-arn ARN

Layout (managerbeyo-infrastructure docs/architecture.md §F):
  assets/<app>/<file>            from <bundle>/<app>/assets/**   immutable, written only if absent, never overwritten
  releases/<sha>/<app>/<file>    every other file                Cache-Control: no-cache
  bundles/<sha>/{SHA256SUMS,manifest.json,published.json}
upload verifies every object against SHA256SUMS (S3 SHA-256 checksums) before it reports success; switch refuses a
release whose bundles/<sha>/published.json is missing. Nothing is ever deleted. Needs boto3 with CRT (SigV4A for KVS).
"""
import argparse
import base64
import datetime
import hashlib
import json
import os
import re
import sys

import boto3
from botocore.exceptions import ClientError

APPS = ["managers", "workers", "sellers", "floor", "studio"]
TYPES = {
    "html": "text/html; charset=utf-8", "js": "text/javascript; charset=utf-8", "mjs": "text/javascript; charset=utf-8",
    "css": "text/css; charset=utf-8", "json": "application/json", "webmanifest": "application/manifest+json",
    "map": "application/json", "svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "webp": "image/webp", "gif": "image/gif", "ico": "image/x-icon", "woff": "font/woff", "woff2": "font/woff2",
    "ttf": "font/ttf", "txt": "text/plain; charset=utf-8", "xml": "application/xml", "wasm": "application/wasm",
    "mp3": "audio/mpeg", "mp4": "video/mp4", "webm": "video/webm", "pdf": "application/pdf",
}
IMMUTABLE = "public, max-age=31536000, immutable"
SHA = re.compile(r"^[0-9a-f]{40}$")


def plan(bundle, sha):
    """[(local path, key, cache-control, content-type, sha256 hex)] from SHA256SUMS; every listed file must exist."""
    sums = {}
    for line in open(os.path.join(bundle, "SHA256SUMS"), encoding="utf-8"):
        digest, rel = line.rstrip("\n").split(None, 1)
        sums[rel.lstrip("*").removeprefix("./")] = digest
    items = []
    for rel, digest in sorted(sums.items()):
        app, _, rest = rel.partition("/")
        if app not in APPS or not rest:
            sys.exit(f"unexpected file in the bundle: {rel}")
        ext = rest.rsplit(".", 1)[-1].lower() if "." in rest.rsplit("/", 1)[-1] else ""
        ctype = TYPES.get(ext, "application/octet-stream")
        if rest.startswith("assets/"):
            items.append((os.path.join(bundle, rel), f"assets/{app}/{rest[len('assets/'):]}", IMMUTABLE, ctype, digest))
        else:
            items.append((os.path.join(bundle, rel), f"releases/{sha}/{app}/{rest}", "no-cache", ctype, digest))
    missing = sorted(set(APPS) - {k.split("/")[2] for _, k, *_ in items if k.startswith("releases/")})
    if missing:
        sys.exit("the bundle has no files for: " + ", ".join(missing))
    return items


def b64(hex_digest):
    return base64.b64encode(bytes.fromhex(hex_digest)).decode()


def remote_sha256(s3, bucket, key):
    try:
        r = s3.head_object(Bucket=bucket, Key=key, ChecksumMode="ENABLED")
    except ClientError as e:
        if e.response["Error"]["Code"] in ("404", "NoSuchKey", "NotFound"):
            return None
        raise
    return r.get("ChecksumSHA256", "")


def upload(a):
    if not SHA.match(a.sha):
        sys.exit("frontend sha must be 40 hex characters")
    s3 = boto3.client("s3")
    items = plan(a.bundle, a.sha)
    put = kept = 0
    for path, key, cache, ctype, digest in items:
        data = open(path, "rb").read()
        if hashlib.sha256(data).hexdigest() != digest:
            sys.exit(f"{path} does not match SHA256SUMS")
        have = remote_sha256(s3, a.bucket, key)
        if have == b64(digest):
            kept += 1
            continue
        if have is not None:  # same key, different bytes: never overwrite (hashed assets and releases are immutable)
            sys.exit(f"s3://{a.bucket}/{key} exists with different content; refusing to overwrite")
        s3.put_object(Bucket=a.bucket, Key=key, Body=data, ContentType=ctype, CacheControl=cache,
                      ChecksumAlgorithm="SHA256", ChecksumSHA256=b64(digest), IfNoneMatch="*")
        put += 1
    bad = [k for _, k, _, _, d in items if remote_sha256(s3, a.bucket, k) != b64(d)]
    if bad:
        sys.exit("verification failed for: " + ", ".join(bad[:10]))
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest = {"frontend_sha": a.sha, "image": a.image, "apps": APPS, "files": len(items),
                "releases": sum(1 for i in items if i[1].startswith("releases/")),
                "assets": sum(1 for i in items if i[1].startswith("assets/"))}
    for name, body, ctype in (("SHA256SUMS", open(os.path.join(a.bundle, "SHA256SUMS"), "rb").read(), "text/plain"),
                              ("manifest.json", json.dumps(manifest, indent=1).encode(), "application/json"),
                              ("published.json", json.dumps({**manifest, "verified_at": now,
                                                             "run": os.environ.get("GITHUB_RUN_ID", "manual")}).encode(),
                               "application/json")):
        s3.put_object(Bucket=a.bucket, Key=f"bundles/{a.sha}/{name}", Body=body, ContentType=ctype, CacheControl="no-cache")
    print(f"published {a.sha}: {len(items)} files verified ({put} uploaded, {kept} already present), "
          f"{manifest['releases']} release files, {manifest['assets']} assets")


def kvs_client():
    return boto3.client("cloudfront-keyvaluestore", region_name="us-east-1")


def show(a):
    k = kvs_client()
    for it in sorted(k.list_keys(KvsARN=a.kvs_arn).get("Items", []), key=lambda x: x["Key"]):
        print(it["Key"], "=", it["Value"])


def switch(a):
    if not SHA.match(a.sha):
        sys.exit("frontend sha must be 40 hex characters")
    apps = a.apps.split(",") if a.apps else APPS
    if set(apps) - set(APPS):
        sys.exit("unknown app in --apps")
    s3 = boto3.client("s3")
    try:
        pub = json.loads(s3.get_object(Bucket=a.bucket, Key=f"bundles/{a.sha}/published.json")["Body"].read())
    except ClientError:
        sys.exit(f"release {a.sha} is not published (no bundles/{a.sha}/published.json)")
    for app in apps:
        if remote_sha256(s3, a.bucket, f"releases/{a.sha}/{app}/index.html") is None:
            sys.exit(f"releases/{a.sha}/{app}/index.html is missing")
    k = kvs_client()
    before = {i["Key"]: i["Value"] for i in k.list_keys(KvsARN=a.kvs_arn).get("Items", [])}
    etag = k.describe_key_value_store(KvsARN=a.kvs_arn)["ETag"]
    k.update_keys(KvsARN=a.kvs_arn, IfMatch=etag, Puts=[{"Key": f"release:{app}", "Value": a.sha} for app in apps])
    for app in apps:
        print(f"release:{app}: {before.get('release:' + app, '-')} -> {a.sha}")
    print(f"switched {len(apps)} app(s) to {a.sha} ({pub['files']} files, verified {pub['verified_at']}); "
          "rollback = switch to the previous sha above")


p = argparse.ArgumentParser()
sub = p.add_subparsers(dest="cmd", required=True)
u = sub.add_parser("upload"); u.add_argument("bundle"); u.add_argument("sha"); u.add_argument("image"); u.add_argument("--bucket", required=True)
w = sub.add_parser("switch"); w.add_argument("sha"); w.add_argument("--bucket", required=True); w.add_argument("--kvs-arn", required=True); w.add_argument("--apps")
h = sub.add_parser("show"); h.add_argument("--kvs-arn", required=True)
args = p.parse_args()
{"upload": upload, "switch": switch, "show": show}[args.cmd](args)
