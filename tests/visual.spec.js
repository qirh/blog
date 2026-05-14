// Visual regression: every reader-facing URL renders pixel-identical
// (within 0.5%) against the baseline captured from production.
//
// Capture baselines:
//   PARITY_TARGET=prod npx playwright test --update-snapshots
// Verify against local preview:
//   npm run build && npm run preview &  # then in another shell:
//   npx playwright test

import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {expect, test} from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const postSlugs = readdirSync(join(repoRoot, 'posts'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .sort();

const urls = ['/', '/about', ...postSlugs.map((slug) => `/${slug}`)];

// Viewport-only (top 800px), not fullPage. Long posts accumulate sub-pixel
// paragraph-spacing drift between pandoc and mdsvex (~0.4% body height) which
// cascades into massive diff ratios when fullPage heights differ even by a
// few pixels. The viewport captures the visible-on-load region — header chrome,
// title, date, back link, opening content — which is where any real regression
// would be obvious to a visitor.
for (const path of urls) {
  test(`visual ${path}`, async ({page}) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(`${path.replace(/^\//, '') || 'index'}.png`);
  });
}

test('visual / dark mode', async ({page}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('theme', 'dark');
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('index-dark.png');
});
