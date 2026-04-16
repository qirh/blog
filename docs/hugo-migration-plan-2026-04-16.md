# Move saleh.soy off Hugo to a minimal pandoc + Makefile setup

## Context

The blog currently runs on Hugo with the vendored `beautifulhugo` theme, deployed to Netlify (previously GitLab Pages; `.gitlab-ci.yml` still present). Goal: **fewer dependencies / simpler stack** — no large SSG binary, no vendored theme, nothing magical. The visual redesign is also a reset — **do not port the beautifulhugo styling**; start with a very basic hand-written layout.

The site is unusually well-suited for this:
- 7 posts in `content/post/`, YAML frontmatter limited to `layout / title / date`
- Zero shortcodes (`{{< ... >}}`), zero taxonomies, zero page bundles
- No project-level `layouts/`, `archetypes/`, `data/`, or `assets/` overrides
- The theme is a vendored copy, not a submodule

Brief option survey considered before landing on the recommendation:
- **Another SSG** (Zola, Eleventy, Jekyll): still an SSG. Doesn't solve "fewer deps".
- **Pure HTML, no markdown**: simplest, but loses writing ergonomics.
- **Tiny Python/Node build script + markdown lib**: ~80 LOC, needs a language runtime + pip/npm.
- **Pandoc + Makefile** ← recommended. One well-known binary, no language runtime, ~50 lines of Makefile, templates are plain HTML.

## Recommended approach: pandoc + Makefile

### End state

```
blog/
├── Makefile                 # build + clean + serve targets
├── netlify.toml             # [build] command = "make", publish = "public"
├── posts/                   # source markdown (moved from content/post)
│   ├── 2024-something.md
│   └── ...
├── pages/
│   └── about.md
├── templates/
│   ├── post.html            # wraps a single post (pandoc template)
│   ├── page.html
│   └── index.html           # list of posts (built by script, not pandoc)
├── static/                  # copied verbatim to public/ (images, favicon, css)
│   ├── style.css
│   ├── moi.jpg
│   └── ...
└── public/                  # build output (gitignored)
```

### How the build works

1. `make` walks `posts/*.md`, runs `pandoc -s --template=templates/post.html --metadata-file=<frontmatter>` for each, outputs `public/<slug>.html`.
2. A small shell snippet in the Makefile reads the YAML frontmatter (title + date) from each post to build `public/index.html` from `templates/index.html` using `sed`/`awk` substitution (or a ~15-line `build_index.sh`).
3. `cp -r static/* public/` copies assets.
4. RSS: a second small shell script writes `public/rss.xml` from the same post list. ~20 lines.

Pandoc handles markdown → HTML, syntax highlighting (built-in, replaces Pygments), and template substitution. No JS, no Ruby, no Go runtime on the build host — just `pandoc` (available as a Netlify build-image package or installed via `apt-get` / Homebrew).

### Critical files to create

- `Makefile` — targets: `all`, `posts`, `index`, `rss`, `static`, `clean`, `serve` (uses `python3 -m http.server`)
- `templates/post.html` — minimal pandoc template: `<title>$title$</title>`, an `<h1>$title$</h1>`, a date line, `$body$`, and a link back to `/`. No navbar, no footer chrome beyond a link back to the index.
- `templates/index.html` — minimal list template: site title, short tagline, a `<ul>` of `<date> — <title>` entries. Placeholder the index script substitutes.
- `templates/page.html` — for `about.md`; same shell as `post.html` without the date.
- `static/style.css` — **write fresh, do NOT port from `themes/beautifulhugo/assets/css/`**. Aim for <100 lines: system-font stack, single max-width content column (~680px), comfortable line-height, minimal link styling. Nothing else.
- `netlify.toml`:
  ```toml
  [build]
    command = "make"
    publish = "public"
  [build.environment]
    PANDOC_VERSION = "3.x"
  ```

### Files to move / delete

- Move `content/post/*.md` → `posts/` (no frontmatter changes needed; pandoc reads YAML frontmatter natively)
- Move `content/about.md` → `pages/about.md`
- Move `static/*` as-is (path unchanged), minus any theme-specific assets that the new layout doesn't reference
- Delete after verification: `config.toml`, `themes/` (entire `beautifulhugo` directory), `.gitlab-ci.yml` (Netlify is the deploy target)
- Preserve permalinks: Hugo's `[permalinks] post = "/:title"` means current URLs are `/<slug>`. The new build writes `public/<slug>.html` — Netlify serves `/<slug>` for `<slug>.html` by default, so existing URLs keep working. Verify with a redirect test.

### Existing assets to reuse

- `static/alien_blue.ico`, `static/moi.jpg`, per-post images — unchanged
- Post frontmatter — unchanged, pandoc reads the same YAML
- Post markdown bodies — unchanged

## Verification

1. `make clean && make` produces `public/` with one HTML file per post, an `index.html`, an `rss.xml`, and copied static assets.
2. `make serve` (runs `python3 -m http.server 8000 -d public`) — open `http://localhost:8000` and click through every post, the index, `/about`, and confirm images render.
3. Diff URLs against the current live site: every path that works on saleh.soy today should 200 on the local build.
4. Validate RSS: `curl -s localhost:8000/rss.xml | xmllint --noout -` (no parse errors).
5. Deploy to a Netlify branch preview; confirm same checks pass on the preview URL before pointing `main` at the new build.
6. After main cutover, keep the old `themes/` dir in git history for one release cycle in case a rollback is needed.

## Risks & mitigations

- **Pandoc syntax-highlighting output differs from Pygments.** Mitigation: pandoc ships classed highlight output; pick a built-in `--highlight-style` and add a handful of CSS rules for it in the fresh `style.css`.
- **URL drift breaks inbound links.** Mitigation: enumerate every current URL (`hugo list all` before deleting Hugo) and assert each resolves in the new build; add Netlify `_redirects` for any that moved.
- **Netlify build image may not ship pandoc.** Mitigation: install it in the build command (`apt-get install -y pandoc && make`) or pin a Netlify build image that includes it.
- **Starting layout looks *too* plain.** Acceptable — the point of this reset is to begin from a minimal baseline. Styling can grow back additively once the build pipeline is in place.
