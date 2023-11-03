# /bin/bash
if grep -q error $1; then
  echo "errors in $1"
  out=$(cat $1)
  echo "$out"

  # https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#multiline-strings
  {
    echo 'summary<<EOF'
    echo "$out"
    echo EOF
  } >> "$GITHUB_OUTPUT"

  # echo "summary=$out" >> "$GITHUB_OUTPUT"
  exit 1
fi
out="no errors in $1"
echo "$out"
echo "summary=$out" >> "$GITHUB_OUTPUT"
exit 0
