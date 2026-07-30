#!/usr/bin/env bash
set -euo pipefail

CONFIG="gitleaks.toml"

# Resolve repo root and ensure bundled bin/ is on PATH
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
export PATH="$REPO_ROOT/bin:$PATH"

# Determine gitleaks binary — prefer installed, fallback to bundled
GITLEAKS_CMD="gitleaks"
BUNDLED_BIN=""
for f in gitleaks gitleaks.exe; do
  if [ -x "$REPO_ROOT/bin/$f" ]; then
    BUNDLED_BIN="$REPO_ROOT/bin/$f"
    break
  fi
done

if command -v gitleaks >/dev/null 2>&1; then
  GITLEAKS_CMD="gitleaks"
elif [ -n "$BUNDLED_BIN" ]; then
  GITLEAKS_CMD="$BUNDLED_BIN"
  echo "[secret-scan] Using bundled gitleaks from $BUNDLED_BIN."
else
  if [ "${CI:-}" = "true" ]; then
    echo "[secret-scan] ERROR: gitleaks not available (required in CI)." >&2
    echo "Install: curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/install.sh | bash" >&2
    exit 1
  else
    echo "[secret-scan] WARNING: gitleaks not found; skipping local secret scan." >&2
    echo "To enable locally, install gitleaks or place it in bin/." >&2
    exit 0
  fi
fi

echo "[secret-scan] Preparing staged snapshot..."
TMP_DIR=$(mktemp -d)
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

# Gather staged files (added, copied, modified, renamed) excluding deletions
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)

if [ -z "$STAGED_FILES" ]; then
  echo "[secret-scan] No staged files. Skipping scan."
  exit 0
fi

for f in $STAGED_FILES; do
  # Ensure directory exists in temp
  mkdir -p "$TMP_DIR/$(dirname "$f")"
  # Write staged blob content to temp (handle binary by forcing cat)
  git show :"$f" > "$TMP_DIR/$f" 2>/dev/null || true
done

echo "[secret-scan] Running gitleaks on staged snapshot..."
$GITLEAKS_CMD detect --source "$TMP_DIR" --config="$CONFIG" --verbose --no-banner

echo "[secret-scan] Passed (no high-risk secrets detected)."
