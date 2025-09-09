#!/bin/bash
# Script to list PRs with label 'automerge' and optionally merge them

REPO_DIR="/workspaces/pva-bazaar-app"
cd "$REPO_DIR" || exit 1

if ! command -v gh &> /dev/null; then
  echo "GitHub CLI (gh) not installed. Install it to use this script."
  exit 1
fi

# List open PRs with label 'automerge'
pr_list=$(gh pr list --label automerge --state open --json number,title,headRefName -q '.[] | [.number, .title, .headRefName] | @tsv')

if [ -z "$pr_list" ]; then
  echo "No open PRs labeled 'automerge'."
  exit 0
fi

echo "Found PRs labeled 'automerge':"
echo "$pr_list" | awk -F"\t" '{print "#"$1" - "$2" (branch: "$3")"}'

echo "\nDo you want to merge these PRs? Type 'yes' to proceed:" 
read confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborting. No PRs merged."
  exit 0
fi

# Merge PRs one by one
while IFS=$'\t' read -r number title branch; do
  echo "Merging PR #$number - $title"
  gh pr merge $number --merge --delete-branch --admin
done <<< "$pr_list"

echo "All requested PRs processed."
