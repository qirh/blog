#!/bin/sh
set -eu

SITE_URL="https://saleh.soy"

today=$(date '+%Y-%m-%d')

cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>$SITE_URL/</loc>
    <lastmod>$today</lastmod>
  </url>
EOF

for f in pages/*.md; do
  slug=$(basename "$f" .md)
  cat <<EOF
  <url>
    <loc>$SITE_URL/$slug</loc>
    <lastmod>$today</lastmod>
  </url>
EOF
done

for f in posts/*.md; do
  slug=$(basename "$f" .md)
  date=$(awk '/^date:/{sub(/^date:[[:space:]]*/,""); print; exit}' "$f")
  cat <<EOF
  <url>
    <loc>$SITE_URL/$slug</loc>
    <lastmod>$date</lastmod>
  </url>
EOF
done

cat <<EOF
</urlset>
EOF
