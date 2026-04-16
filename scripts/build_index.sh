#!/bin/sh
set -eu

items_file=$(mktemp)
trap 'rm -f "$items_file"' EXIT

html_escape() {
  printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'
}

for f in posts/*.md; do
  slug=$(basename "$f" .md)
  title=$(awk '/^title:/{sub(/^title:[[:space:]]*/,""); print; exit}' "$f")
  date=$(awk '/^date:/{sub(/^date:[[:space:]]*/,""); print; exit}' "$f")
  title_esc=$(html_escape "$title")
  printf '%s\t%s\t%s\n' "$date" "$slug" "$title_esc"
done | sort -r | awk -F'\t' '{
  printf "      <li><time datetime=\"%s\">%s</time> <a href=\"/%s\">%s</a></li>\n", $1, $1, $2, $3
}' > "$items_file"

while IFS= read -r line; do
  case $line in
    *"<!-- POSTS -->"*) cat "$items_file" ;;
    *) printf '%s\n' "$line" ;;
  esac
done < templates/index.html
