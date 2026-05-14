# saleh.soy test suite

This repo and `qirh/sala_v2` (saleh.sh) share **identical test infrastructure**: same `playwright.config.js` shape, same `scripts/parity_test.mjs` interface (two-mode HTTP/content), same npm scripts, same `testIgnore` + `VISUAL=1` gate. Phase 2 (when saleh.soy merges into `qirh/sala_v2` under `/blog/*`) collapses both suites into one with no paradigm reconciliation.

But the **coverage** differs — `qirh/sala_v2`'s suite has more tests because saleh.sh has more interactive surface to break. This site is mostly read-only content, so its tests focus accordingly.

## What's tested here

| Suite | File | What it covers |
|---|---|---|
| Build smoke | `../scripts/smoke_test.sh` | Build output assertions: file counts, RSS XML validity, sitemap loc count, OG tags, asset presence, link-back regression. |
| Functional | `functional.spec.js` | Behavior at runtime: theme toggle click, theme persistence across reload + navigation, RSS `<link>` auto-discovery, back link on every post, robots.txt `Sitemap:` directive. |
| Visual regression | `visual.spec.js` | Viewport-only screenshots of index, about, every post, plus an index-dark variant. |
| HTTP + content parity | `../scripts/parity_test.mjs` | Two modes (`--mode=http\|content\|all`): HTTP routing/redirects vs structured HTML signal extraction (titles, OG, article text, RSS items, sitemap locs). |

## Why this repo has FEWER tests than `qirh/sala_v2`

The asymmetry tracks the asymmetric surface of each site:

| Surface | saleh.soy (this repo) | saleh.sh |
|---|---|---|
| Keyboard shortcuts | None | 8 chord bindings (English + Arabic + Konami) |
| Languages | 1 | 2 (en + RTL ar) |
| Theme system | One CSS-var attribute on `<html>`, persists `theme` key | Vuex composite store, 4 slots, persists `~~saleh~~-1.6` |
| Build-time HTML injection | None | 2 values (`data-build-timestamp-utc`, `GIT_DESCRIBE.hash`) |
| Netlify redirects | 1 (trailing-slash rewrite) | 8 (`/cv`, `/resume`, `/spider-man`, `/spiderman`, `/address`, `/sunnyside`, `/blog`, `/posts`) |
| Content nature | ~10 static posts/pages | 6 hand-built interactive routes |

This site is **reader-focused** — the interesting surface is "does each post render correctly with the right metadata", not "does this keyboard chord still trigger an animation". Parity content-mode + visual baselines cover the reader surface densely; the small functional spec covers the only stateful UI bit (the theme toggle).

Conversely, the `qirh/sala_v2` suite has tests this one doesn't need:

- Chord navigation, RTL/i18n, Konami code, help-message logging.
- Build-time substitution checks for the timestamp/git-hash interpolation.
- Per-route theme × lang visual matrix.
- 8-redirect HTTP coverage in parity.

And this suite has things that one doesn't need:

- Post auto-discovery via `readdirSync('posts/*.md')` — saleh.sh has hand-coded routes.
- RSS `<item>` parity — no feed on saleh.sh.
- Sitemap `<loc>` list parity that grows with content — saleh.sh's sitemap is fixed.
- `<article>` body-text parity — saleh.sh routes aren't text-heavy.

## How to run

```sh
npm test                    # smoke (build assertions) + functional spec
npm run test:visual         # visual regression vs committed baselines
npm run test:visual:update  # re-baseline against production (PARITY_TARGET=prod)
npm run test:parity         # HTTP + content parity vs $PREVIEW_URL
PREVIEW_URL=https://deploy-preview-XX--salehsoy.netlify.app npm run test:parity
```

## Phase 2 merge

After saleh.sh's SvelteKit rewrite ships and this repo merges in under `/blog/*`:

1. Concatenate the two `parity_test.mjs` URL lists. This repo brings its content-mode signal extraction; the merge target brings 8-redirect HTTP coverage. Already same interface (`--mode=http|content|all`).
2. Union the visual baselines under one snapshot dir. This repo's are viewport-only single-language; sala_v2's are viewport-only theme × lang. Same 1280×800 / 0.5% threshold.
3. Single `playwright.config.js` and `package.json` scripts. Already identical-shape in both repos.
4. Consolidate `tests/` — functional specs from both side-by-side, single visual.spec.js.

No design decisions left. Just a routing/config combine.
