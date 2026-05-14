// Visual regression suite. Baselines are captured against production once
// (`npm run test:visual:update`), committed to the repo, and then re-checked
// against `vite preview` (auto-spawned via webServer below) on every run.
//
// Visual baselines are OS-specific (Playwright suffixes snapshot filenames
// with the platform), so the spec is excluded from `npm test` by default
// and CI stays green. Opt in via:
//
//   npm run test:visual                                # verify preview vs baseline
//   npm run test:visual:update                         # re-baseline against prod
//
// Convention mirrors qirh/sala_v2 PR #92 so Phase 2 can collapse both repos'
// test infra into one with minimal restructuring.

import {defineConfig, devices} from '@playwright/test';

const TARGET = process.env.PARITY_TARGET || 'preview';
const PROD_URL = process.env.PROD_URL || 'https://saleh.soy';
const PREVIEW_URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const baseURL = TARGET === 'prod' ? PROD_URL : PREVIEW_URL;

export default defineConfig({
  testDir: 'tests',
  // Visual specs are OS-specific; skip unless VISUAL=1 is set (the
  // test:visual* npm scripts set it for you).
  testIgnore: process.env.VISUAL ? [] : ['**/visual.spec.js'],
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'off'
  },
  expect: {
    toHaveScreenshot: {
      // 0.5% tolerance for antialiasing / font hinting noise on the viewport
      // capture. Heights are deterministic (viewport is fixed at 1280×800),
      // so unlike fullPage there's no cascade-shift problem on long posts.
      maxDiffPixelRatio: 0.005,
      animations: 'disabled'
    }
  },
  // Auto-spawn `vite preview` for local runs; reuse if already up. Skipped
  // when targeting prod since baselines are captured straight against
  // saleh.soy and no local server is needed.
  webServer:
    TARGET === 'prod'
      ? undefined
      : {
          command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
          url: PREVIEW_URL,
          // Always reuse a running preview. CI workflows often have an
          // earlier step that started a preview for parity checks; the
          // Playwright-recommended `!CI` would make the visual step error
          // instead of reusing. The downside locally — running against a
          // stale build until you re-run `npm run build` — is minor and
          // easy to recover from.
          reuseExistingServer: true,
          timeout: 120000
        },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome'], viewport: {width: 1280, height: 800}}
    }
  ]
});
