#!/usr/bin/env bash
#
# End-to-end regression for the ana-docs happy path:
#   scaffold → CI jobs → Docker build → live web behind Basic auth
#
# Reproduces the full deploy chain locally, EXCEPT `gcloud run deploy` (Cloud Run
# just runs the same container on port 8080, which this script exercises).
#
# It scaffolds with the default npm source, so the scaffolded site consumes the
# PUBLISHED @techfides/tf-doc-vault library: this branch's template and CLI run
# locally, but the shipped library code does not. Run it on a clean checkout
# while package.json still points at the published version, i.e. BEFORE the
# release version bump, otherwise the pinned version cannot resolve from npm.
#
# Requires: docker (daemon running), pnpm, node, git, curl.
# Env overrides: PORT (default 8099), BASIC_AUTH_USER, BASIC_AUTH_PASS.
#
# Exit code: 0 = all checks passed, N = N checks failed. A fatal prerequisite
# (missing docker, build failure) prints an "ABORT" line and exits 1.

set -uo pipefail

FAILS=0
step() { printf '\n=== %s ===\n' "$*"; }
pass() { printf '  \xe2\x9c\x93 PASS: %s\n' "$*"; }
fail() { printf '  \xe2\x9c\x97 FAIL: %s\n' "$*"; FAILS=$((FAILS + 1)); }
die()  { printf '  \xe2\x9c\x97\xe2\x9c\x97 ABORT: %s\n' "$*"; exit 1; }

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMG="tf-doc-vault-e2e:$$"
CT="tf-doc-vault-e2e-$$"
PORT="${PORT:-8099}"
BUSER="${BASIC_AUTH_USER:-docs}"
BPASS="${BASIC_AUTH_PASS:-s3cret-pw}"
# Guard mktemp: an empty $WORK would make create-ana scaffold into the repo.
WORK="$(mktemp -d "${TMPDIR:-/tmp}/tf-doc-vault-e2e.XXXXXX")" || die "mktemp failed"
[ -n "$WORK" ] && [ -d "$WORK" ] || die "mktemp did not create a work dir"

cleanup() {
  docker rm -f "$CT" >/dev/null 2>&1
  docker rmi "$IMG" >/dev/null 2>&1
  [ -n "${WORK:-}" ] && rm -rf "$WORK"
}
trap cleanup EXIT

docker info >/dev/null 2>&1 || die "docker daemon not available"

step "0. build local package (dist/cli + template must be current)"
(cd "$REPO" && pnpm build) >/dev/null 2>&1 || die "pnpm build failed"
pass "local build ok"

step "1. scaffold clean project (nginx-auth, default npm source)"
# create-ana writes into $PWD, so run it from $WORK.
cd "$WORK" || die "cannot cd into work dir $WORK"
node "$REPO/dist/cli/create-ana.js" demo_ana \
  --gcp-project=tfsa-demo --server=nginx-auth >/dev/null 2>&1 \
  || die "scaffold failed"
[ -d "$WORK/demo_ana" ] || die "scaffold did not produce $WORK/demo_ana"
cd "$WORK/demo_ana"

[ "$(git branch --show-current)" = "master" ] && pass "branch is master" || fail "branch is $(git branch --show-current)"
git ls-files | grep -qx "pnpm-lock.yaml" && pass "pnpm-lock.yaml committed" || fail "lockfile not committed"
grep -q '"@techfides/tf-doc-vault": "[0-9]' package.json && pass "npm-versioned dependency" || fail "dependency not npm-versioned"
grep -q '"packageManager": "pnpm@' package.json && pass "packageManager pinned" || fail "packageManager missing"
# Setting BASIC_AUTH_* must auto-select nginx-auth in CI (else the creds are inert).
grep -qE 'BASIC_AUTH_USER.+then SERVER_TYPE=nginx-auth' .gitlab-ci.yml && pass "CI derives nginx-auth from BASIC_AUTH_USER" || fail "CI does not enable auth from BASIC_AUTH_USER"

step "2. simulate CI jobs on a FRESH clone (like the GitLab runner checkout)"
git clone -q "$WORK/demo_ana" "$WORK/ci" || die "clone failed"
cd "$WORK/ci"
CI=true pnpm install --frozen-lockfile >/dev/null 2>&1 && pass "install --frozen-lockfile" || fail "frozen install failed"
pnpm run typecheck     >/dev/null 2>&1 && pass "typecheck"     || fail "typecheck"
pnpm run lint          >/dev/null 2>&1 && pass "lint"          || fail "lint"
pnpm run format:check  >/dev/null 2>&1 && pass "format:check"  || fail "format:check"
pnpm run docs:validate >/dev/null 2>&1 && pass "docs:validate" || fail "docs:validate"

step "3. Docker build: real multi-stage build (SERVER_TYPE=nginx-auth)"
cd "$WORK/demo_ana"
docker build \
  --build-arg SERVER_TYPE=nginx-auth \
  --build-arg BASIC_AUTH_USER="$BUSER" \
  --build-arg BASIC_AUTH_PASS="$BPASS" \
  -t "$IMG" . >/dev/null 2>&1 \
  || die "docker build failed (this is the build stage the pipeline runs)"
pass "image built"

step "4. run container + probe the live site behind Basic auth"
docker run -d --name "$CT" -p "$PORT:8080" "$IMG" >/dev/null || die "docker run failed"
ready=0
for _ in $(seq 1 60); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then ready=1; break; fi
  sleep 0.5
done
[ "$ready" = 1 ] || die "container not reachable on port $PORT within 30s (port in use? build broken?)"

code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/")
[ "$code" = "401" ] && pass "GET / without creds -> 401 (Basic auth active)" || fail "GET / without creds -> $code (expected 401)"

code=$(curl -s -u "$BUSER:$BPASS" -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/")
[ "$code" = "200" ] && pass "GET / with creds -> 200" || fail "GET / with creds -> $code (expected 200)"

html=$(curl -s -u "$BUSER:$BPASS" "http://127.0.0.1:$PORT/")

# Extract the asset URL *with any base prefix* (the full href/src value), so a
# wrong base is actually exercised: a base-prefixed URL 404s against the
# root-served dist. A base-stripped substring (/assets/…) would always resolve
# to the physical file regardless of base and could never catch the regression.
asset=$(printf '%s' "$html" | grep -oE '(href|src)="[^"]*/assets/[^"]+\.(css|js)"' | head -1 | sed -E 's/^[^"]*"//; s/"$//')
if [ -n "$asset" ]; then
  code=$(curl -s -u "$BUSER:$BPASS" -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$asset")
  [ "$code" = "200" ] && pass "asset $asset -> 200" || fail "asset $asset -> $code (base/serving mismatch)"
  # A correct base serves at root, so refs read /assets/… not /<base>/assets/… .
  case "$asset" in
    /assets/*) pass "asset referenced at root ($asset)" ;;
    *) fail "asset referenced under a base prefix: $asset (base-path regression)" ;;
  esac
else
  fail "no /assets/* reference found in index.html"
fi

echo
if [ "$FAILS" -eq 0 ]; then
  echo "========== ALL CHECKS PASSED =========="
else
  echo "========== $FAILS CHECK(S) FAILED =========="
fi
exit "$FAILS"
