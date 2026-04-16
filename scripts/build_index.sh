#!/bin/sh
set -eu

items_file=$(mktemp)
trap 'rm -f "$items_file"' EXIT

for f in posts/*.md; do
  slug=$(basename "$f" .md)
  title=$(awk '/^title:/{sub(/^title:[[:space:]]*/,""); print; exit}' "$f")
  date=$(awk '/^date:/{sub(/^date:[[:space:]]*/,""); print; exit}' "$f")
  printf '%s\t%s\t%s\n' "$date" "$slug" "$title"
done | sort -r | awk -F'\t' '{
  printf "      <li><time datetime=\"%s\">%s</time> <a href=\"/%s\">%s</a></li>\n", $1, $1, $2, $3
}' > "$items_file"

while IFS= read -r line; do
  case $line in
    *"<!-- POSTS -->"*) cat "$items_file" ;;
    *) printf '%s\n' "$line" ;;
  esac
done < templates/index.html
