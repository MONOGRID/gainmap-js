#!/bin/bash
if [ ! -f "$1" ]; then
  echo "log file $1 not found"
  echo "summary=log file $1 not found" >> "$GITHUB_OUTPUT"
  echo "conclusion=failure" >> "$GITHUB_OUTPUT"
  exit 1
fi

if grep -qi error "$1"; then
  echo "errors in $1"
  out=$(cat "$1")
  echo "$out"

  # first `sed` replaces newlines with \n
  # seconds `sed` replaces quotes with escaped quotes \"

  echo "summary=$(echo "$out" | sed ':a;N;$!ba;s/\n/\\n/g' | sed 's/"/\\"/g' )" >> "$GITHUB_OUTPUT"
  echo "conclusion=failure" >> "$GITHUB_OUTPUT"
  exit 1
fi
out="no errors in $1"
echo "$out"
echo "summary=$out" >> "$GITHUB_OUTPUT"
echo "conclusion=success" >> "$GITHUB_OUTPUT"
exit 0
