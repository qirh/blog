#!/bin/sh
set -eu

SITE_URL="https://saleh.soy"
SITE_TITLE="saleh.soy"
SITE_DESC="Saleh's blog"

to_rfc822() {
  d="$1"
  if date -d "$d" "+%a, %d %b %Y 00:00:00 +0000" >/dev/null 2>&1; then
    date -d "$d" "+%a, %d %b %Y 00:00:00 +0000"
  else
    date -j -f "%Y-%m-%d" "$d" "+%a, %d %b %Y 00:00:00 +0000"
  fi
}

xml_escape() {
  printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g'
}

first_para() {
  pandoc -f markdown -t plain "$1" | awk 'BEGIN{RS=""} NR==1 {gsub(/\n/, " "); print; exit}' | cut -c1-280
}

build_date=$(to_rfc822 "$(date '+%Y-%m-%d')")

cat <<EOF
<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>$SITE_TITLE</title>
  <link>$SITE_URL</link>
  <description>$SITE_DESC</description>
  <language>en-us</language>
  <lastBuildDate>$build_date</lastBuildDate>
EOF

for f in posts/*.md; do
  slug=$(basename "$f" .md)
  title=$(awk '/^title:/{sub(/^title:[[:space:]]*/,""); print; exit}' "$f")
  date_iso=$(awk '/^date:/{sub(/^date:[[:space:]]*/,""); print; exit}' "$f")
  printf '%s\t%s\t%s\n' "$date_iso" "$slug" "$title"
done | sort -r | while IFS=$(printf '\t') read -r date_iso slug title; do
  pub=$(to_rfc822 "$date_iso")
  title_esc=$(xml_escape "$title")
  desc_esc=$(xml_escape "$(first_para "posts/$slug.md")")
  cat <<EOF
  <item>
    <title>$title_esc</title>
    <link>$SITE_URL/$slug</link>
    <guid isPermaLink="true">$SITE_URL/$slug</guid>
    <pubDate>$pub</pubDate>
    <description>$desc_esc</description>
  </item>
EOF
done

cat <<EOF
</channel>
</rss>
EOF
