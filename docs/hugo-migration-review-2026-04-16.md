# Review — Move saleh.soy off Hugo to pandoc + Makefile

## Overview

Replaced the Hugo + beautifulhugo theme with a bare-bones pipeline: markdown source → `pandoc` → static HTML, wrapped by a 40-line `Makefile` and three tiny shell scripts. The `beautifulhugo` theme (117 files, ~12.5k lines) was removed entirely, along with `config.toml` and `.gitlab-ci.yml`. Deployment target stayed on Netlify.

Net diff: **+462 / −12,518** lines across 143 files.

## Architecture

```
blog/
├── Makefile                 # 40 lines; targets: all posts pages static index rss sitemap clean serve
├── netlify.toml             # downloads pandoc 3.5 tarball, runs make
├── posts/                   # post markdown (moved from content/post)
├── pages/                   # page markdown (moved from content/)
├── templates/
│   ├── post.html            # pandoc template, <title>/<h1>/<date>/$body$/back-links
│   ├── page.html            # about page template (no date)
│   └── index.html           # post listing template (injection via shell)
├── static/
│   ├── style.css            # ~120 lines, light+dark palette, hand-written
│   ├── theme.js             # 25 lines, toggle with localStorage persistence
│   ├── moi.jpg, alien_blue.ico, per-post images
│   └── ...
├── scripts/
│   ├── build_index.sh       # reads frontmatter, sorts, substitutes into index template
│   ├── build_rss.sh         # RSS 2.0 with item descriptions from first paragraph
│   └── build_sitemap.sh     # sitemap.xml with lastmod from post dates
└── docs/                    # plan.md + this review.md
```

## Key implementation details

### Pandoc invocation

Settled on:

```
pandoc -s -f markdown+lists_without_preceding_blankline-implicit_figures \
  --template=templates/post.html --highlight-style=pygments \
  --metadata url="/<slug>" \
  -o public/<slug>.html posts/<slug>.md
```

Three non-obvious flags:

- `+lists_without_preceding_blankline` — Hugo's goldmark is lenient about ordered lists that aren't preceded by a blank line; pandoc isn't by default. Without this, `funny-week.md` renders numbered lists as a single paragraph.
- `-implicit_figures` — pandoc's default wraps single-image paragraphs in `<figure>` with the alt text as a visible `<figcaption>`. The original site had no captions; disabling matches prior rendering.
- `--metadata url="/<slug>"` — exposes the page URL to the template for Open Graph tags.

### Netlify build

`netlify.toml:1-3`:

```toml
[build]
  command = "curl -sSL https://github.com/jgm/pandoc/releases/download/3.5/pandoc-3.5-linux-amd64.tar.gz | tar -xz -C /tmp --strip-components=1 && PATH=/tmp/bin:$PATH make"
  publish = "public"
```

Downloads a pinned pandoc 3.5 static binary at build time rather than relying on the build image's package manager. Version-pinned for reproducibility.

### Theme toggle

`static/theme.js` + an inline `<head>` script in each template. The inline script reads `localStorage.theme` before CSS parses and sets `data-theme` on `<html>`, preventing FOUC. `theme.js` (deferred) wires the click handler and updates the button icon + `aria-pressed` + `aria-label`.

CSS uses two layered rules in `static/style.css:11-20`:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark vars */ }
}
:root[data-theme="dark"] { /* dark vars */ }
```

OS preference wins unless the user explicitly picks a theme, in which case the explicit choice wins.

### URL preservation

Hugo was configured with `[permalinks] post = "/:title"`. Post filenames already matched the title-derived slugs (e.g., `funny-week.md` → `/funny-week`). The new build writes `public/<slug>.html`; Netlify's pretty-URL handling serves `/<slug>` → `<slug>.html`. No `_redirects` needed.

## Deviations from plan

- **Build-host pandoc install.** Plan proposed `apt-get install -y pandoc && make` with a `PANDOC_VERSION` env var. In practice, the apt-based approach assumes a specific build image; switched to downloading a pinned static binary from GitHub releases, which is version-independent of the build host.
- **Netlify `apt-get` flagged.** First preview build failed with `Unknown option --syntax-highlighting` — local pandoc 3.9 accepts both old and new flag names but 3.5 only accepts `--highlight-style`. Reverted to the older flag (emits a deprecation warning on pandoc 3.9+).
- **Post images rendering as code.** `posts/my-world-map.md` had indented raw HTML `<img>` tags inside `<div>` wrappers. Pandoc parsed the 4-space indentation as a code block. Rewrote to markdown image syntax.
- **`.linebreak` class had no CSS.** The three Spider-Man posts use `<div class="linebreak">` ~30 times as vertical spacers, backed by theme CSS in the old build. Added a one-line rule (`height: 1.5rem`) in `static/style.css:105`.
- **Scope grew during review.** What started as a build-system swap picked up several adjacent improvements flagged in code review: OG/Twitter meta tags on all templates, sitemap, RSS item descriptions, HTML-escape in the index builder, `aria-pressed` + `:focus-visible` on the theme toggle, frontmatter-driven page titles with multi-word filename fallback, and an avatar image on `/about`.

## Challenges & solutions

- **Pandoc's awk-in-shell pipeline for RSS descriptions.** First attempt used a line-by-line awk that tracked whether a first paragraph had been printed. It double-printed because awk's `END` block still runs after `exit`. Replaced with paragraph-mode awk (`BEGIN{RS=""} NR==1 {gsub(/\n/," "); print; exit}`) — cleaner and correct.
- **BSD vs GNU `date`.** macOS ships BSD `date -j -f`; Linux ships GNU `date -d`. Wrote `to_rfc822` in `scripts/build_rss.sh:8-15` that probes `-d` first and falls back to `-j`.
- **Hugo's lenient markdown.** Besides `lists_without_preceding_blankline`, I didn't hit others in the 7 existing posts — `-implicit_figures` was the only other flag needed.

## Testing & verification

- `make clean && make` produces 10 files in `public/`: 7 post HTMLs, `index.html`, `about.html`, `rss.xml`, `sitemap.xml`, plus copied `static/*`. Deterministic.
- `xmllint --noout public/rss.xml` and `xmllint --noout public/sitemap.xml` both pass.
- Local `python3 -m http.server 8000 -d public` returns 200 for every post slug (with `.html`), the index, `/about.html`, `/style.css`, `/rss.xml`, `/sitemap.xml`, and all images.
- Netlify branch preview (`deploy-preview-2--salehsoy.netlify.app`) green on the latest commit. Pretty URLs (`/funny-week` without `.html`) resolve correctly on Netlify.
- Codex code review caught two regressions that verification had missed — map images rendering as `<pre><code>` and the missing `.linebreak` CSS rule. Both fixed.

## Lessons learned

- **Rendering verification ≠ URL probing.** My first pass confirmed every URL returned 200 but didn't check what the HTML actually contained. The world-map images were technically "present" (the file existed, the server returned 200), but the content inside was broken. Next time: diff rendered HTML against an expected sample per post, not just HTTP status codes.
- **Pandoc's markdown strictness is a feature, but the transition cost is real.** Hugo / goldmark / CommonMark / pandoc-markdown all differ on list blank-line rules, indented HTML, implicit figures, etc. The `+/- extension` flag soup is the safety valve.
- **Pin pandoc versions early.** Netlify image pandoc ≠ local pandoc ≠ CI image pandoc. `--syntax-highlighting` vs `--highlight-style` cost one failed preview build. Pin the tarball, validate against that version locally before pushing.
- **Keep the back-out plan close.** Netlify keeps deploy history; if the pandoc build breaks prod, rolling back to the last Hugo deploy is one click. I could have been more aggressive earlier knowing that safety net exists.

## Next steps

Deferred follow-ups (not blocking this PR):

- Replace `--highlight-style=pygments` with `--syntax-highlighting=pygments` once Netlify's pandoc version catches up to 3.6+.
- Consider adding `sha256sum` verification to the pandoc tarball download in `netlify.toml`.
- Switch embedded image URLs in posts from `https://gitlab.com/qirh/blog/-/raw/main/static/...` to site-relative paths (`/map_without_borders.png` etc.) — removes the external gitlab dependency.
- Write-time workflow: consider a `make new-post TITLE="..."` target that scaffolds a dated markdown file.
- Replace the `☾`/`☀` unicode icons on the theme toggle with inline SVG for consistent rendering across systems.
