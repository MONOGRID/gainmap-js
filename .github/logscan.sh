# /bin/bash
if grep -q error $1; then
  echo "errors in $1"
  out=$(cat $1)
  echo "$out"

  # first `sed` replaces newlines with \n
  # seconds `sed` replaces quotes with escaped quotes \"

  echo "summary=$(echo "$out" | sed ':a;N;$!ba;s/\n/\\n/g' | sed 's/"/\\"/g' )" >> "$GITHUB_OUTPUT"
  exit 1
fi
out="no errors in $1"
echo "$out"
echo "summary=$out" >> "$GITHUB_OUTPUT"
exit 0
