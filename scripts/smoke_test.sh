#!/bin/sh
set -eu

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
pass=0
check() { echo "  ✓ $1"; pass=$((pass + 1)); }

PORT="${PORT:-4173}"
BASE_URL="http://127.0.0.1:$PORT"
PREVIEW_LOG="${TMPDIR:-/tmp}/saleh-soy-preview.log"

cleanup() {
  if [ "${preview_pid:-}" ]; then
    kill "$preview_pid" >/dev/null 2>&1 || true
    wait "$preview_pid" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

fetch() {
  curl -fsS "$BASE_URL$1"
}

headers() {
  curl -fsS -D - -o /dev/null "$BASE_URL$1"
}

title_from_post() {
  awk -F': ' '/^title: / { print $2; exit }' "$1"
}

echo "==> npm run build"
npm run build >/dev/null

echo "==> npm run preview"
npm run preview -- --host 127.0.0.1 --port "$PORT" >"$PREVIEW_LOG" 2>&1 &
preview_pid=$!

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if fetch / >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

fetch / >/dev/null 2>&1 || {
  sed -n '1,120p' "$PREVIEW_LOG" >&2 || true
  fail "preview server did not start on $BASE_URL"
}

echo "==> asserting served site"

post_count=$(find posts -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')
page_count=$(find pages -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')

index_html=$(fetch /)
printf '%s' "$index_html" | grep -q 'id="theme-toggle"' || fail "index missing theme-toggle button"
printf '%s' "$index_html" | grep -q 'src="/theme.js"' || fail "index missing theme.js script tag"
check "index serves shared site chrome"

for f in posts/*.md; do
  slug=$(basename "$f" .md)
  title=$(title_from_post "$f")
  printf '%s' "$index_html" | grep -qF "href=\"/$slug\"" || fail "index missing link to /$slug"
  post_html=$(fetch "/$slug")
  printf '%s' "$post_html" | grep -qF "<h1>$title</h1>" || fail "/$slug missing h1 title"
  printf '%s' "$post_html" | grep -qF "<time datetime=" || fail "/$slug missing date"
  printf '%s' "$post_html" | grep -qF 'property="og:type" content="article"' || fail "/$slug missing article og:type"
  printf '%s' "$post_html" | grep -qF "https://saleh.soy/$slug" || fail "/$slug missing canonical OG URL"
  printf '%s' "$post_html" | grep -qF '<p class="back"><a href="/">← all posts</a></p>' || fail "/$slug missing back link"
  [ "$(printf '%s' "$post_html" | grep -o 'class="back"' | wc -l | tr -d ' ')" = "2" ] || fail "/$slug should have 2 back links"
  if printf '%s' "$post_html" | grep -q '<pre><code>&lt;img'; then
    fail "/$slug has indented raw HTML parsed as code"
  fi
done
check "every post route serves, has metadata, and is linked from index"

about_html=$(fetch /about)
printf '%s' "$about_html" | grep -q 'class="avatar"' || fail "/about missing avatar image"
printf '%s' "$about_html" | grep -q 'mailto:saleh@alghusson.com' || fail "/about missing mailto link"
printf '%s' "$about_html" | grep -q 'id="theme-toggle"' || fail "/about missing theme-toggle button"
check "about page serves with expected content and chrome"

spider_html=$(fetch /spider-man-in-sunnyside-1)
printf '%s' "$spider_html" | grep -q 'class="linebreak"' \
  || fail "spider-man post missing .linebreak div"
check ".linebreak divs preserved in posts"

rss_headers=$(headers /rss.xml)
printf '%s' "$rss_headers" | grep -Eqi 'content-type: (application|text)/xml' \
  || fail "/rss.xml should return XML"
rss_file="${TMPDIR:-/tmp}/saleh-soy-rss.xml"
fetch /rss.xml >"$rss_file"
xmllint --noout "$rss_file" || fail "rss.xml invalid XML"

rss_items=$(grep -c '<item>' "$rss_file")
[ "$rss_items" = "$post_count" ] || fail "expected $post_count rss <item> blocks, got $rss_items"
rss_descs=$(grep -c '<description>' "$rss_file")
expected_descs=$((post_count + 1))  # 1 channel + 1 per item
[ "$rss_descs" = "$expected_descs" ] || fail "expected $expected_descs <description> (1 channel + $post_count items), got $rss_descs"
check "rss.xml serves valid XML with $post_count items"

sitemap_file="${TMPDIR:-/tmp}/saleh-soy-sitemap.xml"
fetch /sitemap.xml >"$sitemap_file"
xmllint --noout "$sitemap_file" || fail "sitemap.xml invalid XML"
sm_urls=$(grep -c '<loc>' "$sitemap_file")
expected_urls=$((post_count + page_count + 1))  # home + posts + pages
[ "$sm_urls" = "$expected_urls" ] || fail "expected $expected_urls <loc> entries in sitemap (home + $page_count pages + $post_count posts), got $sm_urls"
check "sitemap.xml serves valid XML with all $expected_urls URLs"

for path in /style.css /theme.js /moi.jpg /alien_blue.ico /robots.txt; do
  fetch "$path" >/dev/null || fail "$path missing"
done
check "static assets serve from URL root"

printf '\nPASS: %d checks\n' "$pass"
