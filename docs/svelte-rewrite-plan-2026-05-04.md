# Migrate saleh.soy from pandoc/Makefile to SvelteKit

## Context

This is **Phase 1B** of a three-phase project to unify saleh.sh and saleh.soy onto a single modern stack:

- **Phase 1A** (a parallel doc in `qirh/sala_v2`): rewrite `saleh.sh` from Vue 2 to SvelteKit. Same domain, same Netlify project. No blog work.
- **Phase 1B** (this doc, this repo): rewrite `saleh.soy` from pandoc/Makefile to SvelteKit. Same domain, same Netlify project. No SPA work.
- **Phase 2** (later, in `qirh/sala_v2`): merge this repo into `sala_v2`, route blog under `/blog/*`, retire this repo.
- **Phase 3** (later): point `saleh.soy` at the unified site via a 301 forwarder Netlify project.

This document is the blueprint for **Phase 1B only**. An executing agent should not touch `qirh/sala_v2` or domain config.

Phase 2 implies this repo will be archived shortly after Phase 1B lands. **That is by design — the Svelte rewrite makes Phase 2's merge much cheaper, even though both phases are throwaway-ish individually.**

## Goal
Ship a SvelteKit replacement of the existing pandoc/Makefile site at `https://saleh.soy`, with full feature parity. Visitors should not be able to tell the rewrite happened.

## Scope

**In:**
- Replace pandoc + Makefile with SvelteKit + `mdsvex`.
- Port the 8 published posts and 1 page (about) — markdown source stays as-is wherever possible.
- Reproduce: post list page, individual post pages, RSS feed, sitemap, theme toggle, OG/meta tags, RSS auto-discovery `<link>`, `Link:` header.
- Preserve every existing URL: `/`, `/{slug}`, `/about`, `/rss.xml`, `/sitemap.xml`, `/robots.txt`, `/style.css` references etc. **Do not change post slugs.**
- Preserve `static/*` asset paths (`/moi.jpg`, `/alien_blue.ico`, `/spiderman/*`, etc.) — the post markdown references them with absolute paths.

**Out:**
- New posts. (`in_progress/` stays untouched.)
- Visual redesign — should look the same.
- Anything saleh.sh-related.
- Anything domain-related.
- Schema for frontmatter beyond `title` + `date` (the only two fields used today).

## Target stack

- **SvelteKit** with the `@sveltejs/adapter-static` adapter — output is fully static.
- **[`mdsvex`](https://mdsvex.com/)** for markdown processing. Each `posts/*.md` becomes a Svelte page.
- **Svelte 5** with runes. JS (no TypeScript) to keep the stack lean — current site has no TS.
- **No CSS framework.** Keep the existing 123-line `static/style.css` as-is, served from `/style.css` like today.
- **Theme toggle:** keep the existing 22-line `static/theme.js` as-is, included via `<svelte:head>` or a layout `<script src="/theme.js">`. Do not rewrite it as a Svelte component — it's a pure DOM toggle that already works.

## End-state file tree

```
blog/
├── package.json                  # svelte/sveltekit/vite/mdsvex
├── svelte.config.js              # adapter-static, mdsvex preprocessor
├── vite.config.js                # minimal
├── netlify.toml                  # build = "npm run build", publish = "build/"
├── mdsvex.config.js              # remark/rehype plugins (highlighter, etc.)
├── src/
│   ├── app.html                  # base shell
│   ├── lib/
│   │   ├── posts.js              # imports all posts/*.md, exports sorted metadata
│   │   ├── PostLayout.svelte     # wraps a post (replaces templates/post.html)
│   │   └── PageLayout.svelte     # wraps a page (replaces templates/page.html)
│   ├── routes/
│   │   ├── +layout.svelte        # site header, theme.js include, nav
│   │   ├── +page.svelte          # post list (replaces templates/index.html + build_index.sh)
│   │   ├── about/+page.svx       # pages/about.md → here, frontmatter intact
│   │   ├── [slug]/+page.svx      # not used — see "Post routing" below
│   │   ├── funny-week/+page.svx
│   │   ├── living-in-a-small-space/+page.svx
│   │   ├── my-world-map/+page.svx
│   │   ├── newsletters/+page.svx
│   │   ├── spider-man-in-sunnyside-1/+page.svx
│   │   ├── spider-man-in-sunnyside-2/+page.svx
│   │   ├── spider-man-in-sunnyside-3/+page.svx
│   │   ├── spider-man-in-sunnyside-4/+page.svx
│   │   ├── rss.xml/+server.js    # builds RSS at runtime/prerender (replaces build_rss.sh)
│   │   └── sitemap.xml/+server.js # (replaces build_sitemap.sh)
├── static/                       # unchanged: moi.jpg, alien_blue.ico, style.css, theme.js, /spiderman/*, robots.txt, etc.
├── posts/                        # KEEP as the canonical source of truth for the post markdown
├── pages/                        # KEEP for about.md
├── in_progress/                  # untouched (drafts; ignored by build)
└── docs/
    ├── hugo-migration-plan-2026-04-16.md     # historical, keep
    ├── hugo-migration-review-2026-04-16.md   # historical, keep
    └── svelte-rewrite-plan-2026-05-04.md     # this file
```

Files to delete in the cutover commit (Step 8): `Makefile`, `templates/`, `scripts/build_index.sh`, `scripts/build_rss.sh`, `scripts/build_sitemap.sh`. **Keep `scripts/smoke_test.sh`** — rewrite it for the new layout in Step 7.

### Post routing

Two viable layouts. **Pick layout A unless something forces B.**

- **Layout A (recommended):** keep `posts/*.md` as the source of truth, copy each to `src/routes/<slug>/+page.svx` at build time via a one-line npm script (`scripts/sync-posts.sh`). Author edits `posts/funny-week.md`, runs `npm run build`, sync script copies + transforms it. **Pro:** authoring path doesn't change. **Pro:** `src/routes/` stays one-source-of-truth for routing. **Con:** small build step.
- **Layout B:** use a single `[slug]/+page.svx` with dynamic markdown loading. **Pro:** one route file. **Con:** mdsvex's static analysis works less well, prerender list has to be hand-fed.

Layout A is what the file tree above assumes.

### Frontmatter contract

Preserved exactly:
```
---
layout: post              # ignored — present for legacy compatibility, do not break it
title: Funny Week
date: 2023-05-21
---
```

`mdsvex` exposes frontmatter as the page's `metadata` export — `title` and `date` consumed by `PostLayout.svelte`, RSS, sitemap, and the index page.

## Migration mapping

| Old (pandoc/Makefile) | New (SvelteKit) | Notes |
|---|---|---|
| `Makefile` (`make`) | `npm run build` | One-line replacement once SvelteKit is configured. |
| `templates/post.html` | `src/lib/PostLayout.svelte` | Same `<head>` content, OG tags, RSS `<link>`, theme bootstrap, `<header>`, `<main><article>`, back-link pattern. |
| `templates/page.html` | `src/lib/PageLayout.svelte` | Smaller — no date, no back link. |
| `templates/index.html` | `src/routes/+page.svelte` | The post list. Loops `posts.js` and renders `<li><time>{date}</time> <a href="/{slug}">{title}</a></li>`. |
| `scripts/build_index.sh` | `src/lib/posts.js` (sort logic) + `src/routes/+page.svelte` | Sort by `date` desc. |
| `scripts/build_rss.sh` | `src/routes/rss.xml/+server.js` | Same XML shape. Use the same RFC822 conversion logic. `first_para` becomes a small remark transform OR a per-post excerpt extracted at build time. |
| `scripts/build_sitemap.sh` | `src/routes/sitemap.xml/+server.js` | Same XML shape. |
| `scripts/smoke_test.sh` | `scripts/smoke_test.sh` (rewritten) | Adapt to assert on the new `build/` output. |
| `posts/*.md` | `posts/*.md` + sync to `src/routes/{slug}/+page.svx` | Preserve markdown verbatim. The sync script can be `for f in posts/*.md; do slug=$(...); cp "$f" "src/routes/$slug/+page.svx"; done`. |
| `pages/about.md` | `src/routes/about/+page.svx` (or sync similarly) | |
| `static/*` | `static/*` | Verbatim copy. SvelteKit serves `static/` at the URL root, same as today. |
| `netlify.toml` build line | New `[build] command = "npm run build"`, `publish = "build/"`. | The current pandoc-curl line goes away — pandoc is no longer needed in CI. |
| `[[redirects]] /*/ → /:splat 200` | **Keep verbatim.** | Trailing-slash handling for old Hugo-era inbound links. |
| `[[headers]] Link: </sitemap.xml>; rel="sitemap"` | **Keep verbatim.** | |

## Execution order

Each step ends with a verification an agent can run. If verification fails, stop and surface the error.

### Step 1: scaffold SvelteKit alongside the existing build
1. Run `npm create svelte@latest svelte` (Skeleton, JS, no TS, no extras). Install `@sveltejs/adapter-static`, `mdsvex`.
2. Configure `svelte/svelte.config.js`:
   - `extensions: ['.svelte', '.svx', '.md']`
   - Preprocess with `mdsvex({ extensions: ['.svx', '.md'], layout: { post: '...PostLayout.svelte', _: '...PageLayout.svelte' } })`.
   - `kit: { adapter: adapter({ pages: 'build', assets: 'build', fallback: '404.html', precompress: false }), prerender: { entries: ['*'] } }`.
3. **Verify:** `cd svelte && npm run build` produces a `build/` with an `index.html`.

### Step 2: wire up posts and pages
1. Write `svelte/scripts/sync-posts.sh`: copies `../posts/*.md` to `svelte/src/routes/<slug>/+page.svx` and `../pages/about.md` to `svelte/src/routes/about/+page.svx`. Add to `package.json`'s `prebuild` script.
2. Write `svelte/src/lib/posts.js`: at module load, import all `+page.svx` from each post route via `import.meta.glob('../routes/**/+page.svx', { eager: true })`. Export an array of `{ slug, title, date, excerpt }` sorted by date desc.
3. Write `svelte/src/lib/PostLayout.svelte` matching `templates/post.html` exactly (header, theme bootstrap script in `<svelte:head>`, OG tags from frontmatter, back link top + bottom, `<article>` wrapper).
4. Write `svelte/src/lib/PageLayout.svelte` matching `templates/page.html`.
5. Write `svelte/src/routes/+layout.svelte`: site header (`<a class="site" href="/">saleh.soy</a>`), nav link to `/about`, theme toggle button, theme.js include via `<script src="/theme.js" defer>`.
6. **Verify:** `npm run dev`, visit `/` (post list shows 8 entries sorted by date desc), `/funny-week` (post renders with title, date, body), `/about` (page renders).

### Step 3: build the RSS endpoint
1. Write `svelte/src/routes/rss.xml/+server.js`. Reuse the exact XML shape from `scripts/build_rss.sh` (`<rss>`, `<channel>`, `<item>` blocks). Excerpt extraction: take the first markdown paragraph of each post, strip markdown to plain text, trim to 280 chars. Use the same RFC822 date conversion.
2. Set `Content-Type: application/xml`.
3. Mark the route prerendered: `export const prerender = true;`.
4. **Verify:** `npm run build && cat build/rss.xml | xmllint --noout -` parses without error; item count equals post count; excerpt of `funny-week` matches what's in the current `public/rss.xml` byte-for-byte modulo whitespace.

### Step 4: build the sitemap endpoint
1. Write `svelte/src/routes/sitemap.xml/+server.js`. Loop `posts.js` + `pages` + the homepage. Same XML shape as `scripts/build_sitemap.sh`.
2. **Verify:** `xmllint --noout build/sitemap.xml` and URL count matches `1 + |posts| + |pages|`.

### Step 5: theme toggle
1. Confirm `static/theme.js` and `static/style.css` both exist (carry over from the current repo). The layout from Step 2 already includes them — no Svelte component needed.
2. **Verify:** in dev, click the toggle button (id `theme-toggle`), `data-theme` attribute on `<html>` flips, persists across reload.

### Step 6: OG, meta, favicon, RSS auto-discovery
1. Cross-check `<head>` against `templates/post.html` and `templates/index.html`. Items that must be present on every page:
   - `<link rel="stylesheet" href="/style.css">`
   - `<link rel="icon" href="/alien_blue.ico">`
   - `<link rel="alternate" type="application/rss+xml" title="saleh.soy RSS" href="/rss.xml">`
   - Theme bootstrap script (the `<script>(function(){try{var t=localStorage.getItem('theme');...})()</script>` snippet) inline in `<head>` so there's no flash.
   - `<script src="/theme.js" defer>`
   - Per-post: `og:title`, `og:url`, `og:image`, `og:type=article`, `og:site_name`, `twitter:card`.
2. **Verify:** view-source on `/funny-week`, all of the above present and equal to current production.

### Step 7: rewrite smoke tests
1. Adapt `scripts/smoke_test.sh` for the new build output. New invariants:
   - `build/index.html` exists.
   - For each post, `build/<slug>/index.html` (SvelteKit's prerender layout) exists.
   - `build/about/index.html` exists.
   - `build/rss.xml` valid XML, `<item>` count matches `posts/*.md`.
   - `build/sitemap.xml` valid XML, `<loc>` count = home + posts + pages.
   - OG / per-page meta checks (same content as today).
   - Static assets present (`build/style.css`, `build/theme.js`, `build/moi.jpg`, `build/alien_blue.ico`).
   - Back link present at top + bottom of any post (`build/funny-week/index.html`).
   - `id="theme-toggle"` present on every page type.
2. **Verify:** `make test` (or, after cutover, `npm test`) passes.

### Step 8: cutover
1. Move `svelte/*` to repo root: `mv svelte/{package.json,svelte.config.js,vite.config.js,mdsvex.config.js,src,scripts/sync-posts.sh} .`.
2. Delete: `Makefile`, `templates/`, `scripts/build_index.sh`, `scripts/build_rss.sh`, `scripts/build_sitemap.sh`. Keep `scripts/smoke_test.sh` (rewritten in Step 7).
3. Update `netlify.toml`: `command = "npm run build"`, `publish = "build/"`. Drop the pandoc-download line. Keep the `[[redirects]]` for trailing-slash handling. Keep the `[[headers]]` Link header.
4. Update `package.json` scripts: `build`, `dev`, `preview`, `test` (calls smoke_test.sh).
5. **Verify:** `rm -rf node_modules build && npm install && npm run build && npm test` all pass.

### Step 9: deploy preview QA
1. Push, open a draft PR.
2. Check on the Netlify deploy preview:
   - [ ] Every existing post URL loads with the same content.
   - [ ] `/about` loads.
   - [ ] `/rss.xml` loads, validates, has the right item count.
   - [ ] `/sitemap.xml` loads.
   - [ ] `/robots.txt` loads (carried over from `static/`).
   - [ ] Theme toggle works in light + dark.
   - [ ] OS dark-mode preference is respected when no manual override is set.
   - [ ] Trailing-slash inbound URL `/funny-week/` still serves the post (Netlify rewrite from `netlify.toml` still active).
   - [ ] Visual diff against current production: zero meaningful differences.
3. Promote draft → ready for review.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| `mdsvex` chokes on raw HTML in the spider-man posts (`<div class="linebreak">`, `<br/>`, inline animation markup). | Tested early in Step 2 with `spider-man-in-sunnyside-1.md`. mdsvex by default allows raw HTML; configure `smartypants` and `remark` plugins minimally to avoid surprise transformations. If a tag breaks, wrap it in `{@html ...}`. |
| Pandoc's auto-syntax-highlighting renders code blocks differently from `mdsvex`'s default. | The current site has no code blocks in any published post (verified). Smoke test asserts no `<pre><code>&lt;img` regression — keep that check. If a post grows code blocks later, configure `rehype-highlight`. |
| RSS feed bytes change subtly enough to confuse already-subscribed clients. | Match the existing RSS output byte-for-byte modulo whitespace. Step 3 verification compares to current production. RSS clients dedupe by `<guid>` — the slug-based GUIDs are stable, so worst case readers see "no new items" until the next post. |
| OG image / meta tags differ → social previews change. | Step 6 explicitly verifies `og:title`, `og:url`, `og:image`, `og:site_name`, `twitter:card` against current production. |
| Theme bootstrap script inlined in `<head>` doesn't fire before paint, causing a light-mode flash for dark-mode users. | The Step 6 inline `<script>` runs before stylesheets — same pattern as the current site. Verify on a slow network throttle. |
| Drafts in `in_progress/` accidentally get included by mdsvex's glob. | The sync script in Step 2 only globs `posts/*.md` and `pages/*.md`. Smoke test asserts post count = `posts/*.md` count. |

## Notes for the executing agent

- **Do not change post slugs.** Existing inbound links and RSS GUIDs depend on them.
- **Do not edit any `.md` file content.** The frontmatter contract (`layout / title / date`) is settled.
- **Do not touch `in_progress/`.**
- **Do not modify the `[[redirects]]` or `[[headers]]` blocks in `netlify.toml`.** They were assembled across PRs in this repo and are still load-bearing.
- After this rewrite ships, **Phase 2 will subtree-merge this repo into `qirh/sala_v2`** and route everything under `/blog/*`. That means an executing agent should not invest effort in domain-specific theming, RSS URL canonicalization to saleh.soy, etc. — those will be re-targeted in Phase 2. Keep the rewrite minimal-surface-area to make Phase 2 cheap.
- The dev loop is `npm run dev` (port 5173 by default).
- The blog has 8 published posts; the rewrite should handle all 8 with no per-post special-casing.
- Existing Netlify project is `salehsoy`. Build output dir changes from `public/` to `build/` — update `netlify.toml`'s `publish` field accordingly.
