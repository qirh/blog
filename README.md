# Blog [![MIT license](https://img.shields.io/badge/license-MIT-lightgrey.svg)](https://gitlab.com/qirh/blog/raw/main/LICENSE)
[saleh.soy](https://saleh.soy)

A minimal static blog: markdown + SvelteKit + mdsvex. No CSS framework, same tiny dark/light theme toggle.

## Build

Requires `node` and `npm`.

```
npm install
npm run dev      # sync markdown and serve locally
npm run build    # sync markdown and build into ./build
npm test         # build, preview, and smoke-test served URLs
```

Posts live in `posts/`, pages in `pages/`, and assets in `static/`. `scripts/sync-posts.sh` materializes generated Svelte routes from markdown before dev/build; those generated files stay ignored.

Deployed via Netlify; see `netlify.toml`.

## History
  * Repo started on GitHub, migrated to GitLab, and then back to GitHub lol
  * Originally Hugo with the [Beautiful Hugo](https://github.com/halogenica/beautifulhugo) theme
  * Migrated to pandoc + Makefile in 2026
  * Migrated to SvelteKit + mdsvex in 2026
  * Repo icon: Icon made by madebyoliver from [flaticon](https://flaticon.com)
  * Blog icon: Icon made using [ionos](https://ionos.com/tools/favicon-generator)
