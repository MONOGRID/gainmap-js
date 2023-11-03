# /bin/bash
if grep -q error $1; then
  echo "errors in $1"
  out=$(cat $1)
  echo "$out"
  # export summary="$out"
  echo "summary=\"$out\"" >> "$GITHUB_OUTPUT"
  exit 1
fi
out="no errors in $1"
echo "$out"
echo "summary=\"$out\"" >> "$GITHUB_OUTPUT"
exit 0
