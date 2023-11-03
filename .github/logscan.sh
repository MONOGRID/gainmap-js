# /bin/bash
if grep -q error $1; then
  echo "errors in $1"
  cat $1 | grep error
  exit 1
fi
echo "no errors in $1"
exit 0
