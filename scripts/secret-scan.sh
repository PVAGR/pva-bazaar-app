#!/usr/bin/env bash
set -euo pipefail

CONFIG="gitleaks.toml"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "[secret-scan] gitleaks not installed." >&2
  echo "Install (Linux/macOS): curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/install.sh | bash" >&2
  exit 1
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
gitleaks detect --source "$TMP_DIR" --config="$CONFIG" --verbose

echo "[secret-scan] Passed (no high-risk secrets detected)."
