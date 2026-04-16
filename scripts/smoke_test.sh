#!/bin/sh
set -eu

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
pass=0
check() { echo "  ✓ $1"; pass=$((pass + 1)); }

echo "==> make clean && make"
make clean >/dev/null
make >/dev/null

echo "==> asserting build output"

html_count=$(ls public/*.html 2>/dev/null | wc -l | tr -d ' ')
[ "$html_count" = "9" ] || fail "expected 9 html files (7 posts + index + about), got $html_count"
check "9 html files"

for slug in funny-week living-in-a-small-space my-world-map newsletters \
            spider-man-in-sunnyside-1 spider-man-in-sunnyside-2 spider-man-in-sunnyside-3; do
  [ -f "public/$slug.html" ] || fail "public/$slug.html missing"
  grep -qF "href=\"/$slug\"" public/index.html || fail "index missing link to /$slug"
done
check "every post rendered and linked from index"

if grep -l '<pre><code>&lt;img' public/*.html >/dev/null 2>&1; then
  fail "found <pre><code>&lt;img — indented raw HTML parsed as code block"
fi
check "no indented-HTML-as-code-block regressions"

xmllint --noout public/rss.xml || fail "rss.xml invalid XML"
xmllint --noout public/sitemap.xml || fail "sitemap.xml invalid XML"
check "rss.xml and sitemap.xml are valid XML"

rss_items=$(grep -c '<item>' public/rss.xml)
[ "$rss_items" = "7" ] || fail "expected 7 rss <item> blocks, got $rss_items"
rss_descs=$(grep -c '<description>' public/rss.xml)
[ "$rss_descs" = "8" ] || fail "expected 8 <description> (1 channel + 7 items), got $rss_descs"
check "rss has 7 items each with a description"

sm_urls=$(grep -c '<loc>' public/sitemap.xml)
[ "$sm_urls" = "9" ] || fail "expected 9 <loc> entries in sitemap (home + about + 7 posts), got $sm_urls"
check "sitemap has all 9 URLs"

grep -q '<meta property="og:title" content="Funny Week">' public/funny-week.html \
  || fail "funny-week.html missing og:title"
grep -q '<meta property="og:url" content="https://saleh.soy/funny-week">' public/funny-week.html \
  || fail "funny-week.html og:url incorrect"
check "OG tags present and per-page on posts"

grep -q 'class="avatar"' public/about.html || fail "about.html missing avatar image"
grep -q 'mailto:saleh@alghusson.com' public/about.html || fail "about.html missing mailto link"
check "about page has avatar and mailto"

for f in public/index.html public/about.html public/funny-week.html; do
  grep -q 'id="theme-toggle"' "$f" || fail "$f missing theme-toggle button"
  grep -q 'src="/theme.js"' "$f" || fail "$f missing theme.js script tag"
done
check "theme toggle and theme.js present on every page type"

grep -q 'class="linebreak"' public/spider-man-in-sunnyside-1.html \
  || fail "spider-man post missing .linebreak div (theme regression)"
check ".linebreak divs preserved in posts"

grep -q '<p class="back"><a href="/">← all posts</a></p>' public/funny-week.html \
  || fail "back link missing from funny-week.html"
[ "$(grep -c 'class="back"' public/funny-week.html)" = "2" ] \
  || fail "expected 2 back links (top + bottom) on a post"
check "back links present at top and bottom of posts"

for f in public/style.css public/theme.js public/moi.jpg public/alien_blue.ico; do
  [ -f "$f" ] || fail "$f missing from public/"
done
check "static assets copied (css, js, images)"

printf '\nPASS: %d checks\n' "$pass"
