# Review — Migrate saleh.soy from pandoc/Makefile to SvelteKit

## Overview

Replaced the pandoc + Makefile blog build with a SvelteKit + mdsvex static build while preserving the public URL surface: `/`, `/<post-slug>`, `/about`, `/rss.xml`, `/sitemap.xml`, `/robots.txt`, and root-served static assets.

## Architecture

The site is now a SvelteKit app at the repository root:

```
package.json
svelte.config.js
vite.config.js
src/
  app.html
  lib/
    PageLayout.svelte
    PostLayout.svelte
    posts.js
  routes/
    +layout.js
    +layout.svelte
    +page.svelte
    rss.xml/+server.js
    sitemap.xml/+server.js
scripts/
  sync-posts.sh
  smoke_test.sh
```

Markdown remains the source of truth in `posts/*.md` and `pages/*.md`. `scripts/sync-posts.sh` materializes generated mdsvex routes under `src/routes/<slug>/+page.svx` plus `src/lib/posts-manifest.json` before dev/build, and those generated files are ignored.

## Key Implementation Details

- `svelte.config.js` uses `@sveltejs/adapter-static` with `mdsvex` layouts resolved by absolute path. Absolute layout paths avoid generated routes importing `./src/lib/...` relative to each post directory.
- `src/routes/+layout.svelte` owns the shared header, nav, stylesheet/favicon/RSS links, inline theme bootstrap, and `theme.js` include.
- `src/lib/PostLayout.svelte` owns post-specific head tags and article markup: title, date, top and bottom `← all posts` links, and article body.
- `src/lib/PageLayout.svelte` handles standalone markdown pages and titlecases the route slug when a page has no frontmatter, which keeps `pages/about.md` unchanged.
- `src/routes/rss.xml/+server.js` and `src/routes/sitemap.xml/+server.js` are prerendered static endpoints backed by the generated manifest.
- `scripts/smoke_test.sh` now tests served URLs through `npm run preview`, so it is not coupled to SvelteKit's internal `build/` file shape.

## Deviations from Plan

- No separate `mdsvex.config.js` was needed; the mdsvex configuration is small enough to live in `svelte.config.js`.
- The static preview server serves prerendered XML files as `text/xml` even though the endpoint declares `application/xml`. The smoke test accepts either XML content type and still validates the body with `xmllint`.
- Generated markdown is lightly transformed before writing `.svx` files: literal text like `<3` / `<--` is escaped for Svelte parsing, and raw image tags without `alt` get `alt=""`. Source markdown files are unchanged.

## Challenges & Solutions

- mdsvex compiled post layouts with paths relative to each generated route when given relative layout paths. Resolved by passing absolute layout paths from `svelte.config.js`.
- Svelte parses bare `<` text as potential tags after markdown compilation. Resolved in the generated output path instead of editing posts.
- `npm install` could not reach the registry inside the default sandbox. Re-ran it with network approval and committed the resulting `package-lock.json`.

## Testing & Verification

Validated with:

```sh
npm run build
npm test
```

`npm test` builds, starts `vite preview`, and verifies all post URLs, the homepage, `/about`, RSS XML, sitemap XML, and root static assets. It also keeps the prior raw-HTML regression check for `<pre><code>&lt;img`.

## Lessons Learned

For mdsvex-based static sites, keeping markdown as source and generating route files is simpler than deriving content metadata from compiled Svelte modules. It also keeps RSS/index metadata generation independent from rendering.

## Next Steps

- Review the low-severity npm audit advisories from the initial dependency install if they matter for deployment policy.
- After this PR lands, Phase 2 can subtree-merge this SvelteKit-shaped blog into `qirh/sala_v2` with less build-system mismatch.
