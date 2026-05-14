// Functional tests — behavior the visual + parity suites don't cover.
//
// Visual catches "the dark-mode baseline drifted." Parity catches
// "the title tag changed." Neither catches "the theme toggle button
// stopped responding to clicks." That's what this file is for.

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

// --- Theme toggle ---------------------------------------------------------

test('theme toggle button flips data-theme on <html>', async ({page}) => {
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.locator('#theme-toggle');
  await expect(toggle).toBeVisible();

  // Whatever the initial state is (depends on OS prefers-color-scheme +
  // localStorage), one click should flip it; a second click flips back.
  const initial = await html.getAttribute('data-theme');
  await toggle.click();
  const afterFirst = await html.getAttribute('data-theme');
  expect(afterFirst).not.toBe(initial);
  expect(['light', 'dark']).toContain(afterFirst);

  await toggle.click();
  const afterSecond = await html.getAttribute('data-theme');
  expect(afterSecond).not.toBe(afterFirst);
});

test('theme persists across reload', async ({page}) => {
  await page.goto('/');
  await page.locator('#theme-toggle').click();
  const themeAfterClick = await page.evaluate(() =>
    localStorage.getItem('theme'),
  );
  expect(['light', 'dark']).toContain(themeAfterClick);

  await page.reload();
  const themeAfterReload = await page.getAttribute('html', 'data-theme');
  expect(themeAfterReload).toBe(themeAfterClick);
});

test('theme persists across navigation', async ({page}) => {
  await page.goto('/');
  await page.locator('#theme-toggle').click();
  const themeOnIndex = await page.getAttribute('html', 'data-theme');

  await page.goto('/about');
  const themeOnAbout = await page.getAttribute('html', 'data-theme');
  expect(themeOnAbout).toBe(themeOnIndex);
});

// --- RSS auto-discovery + canonical metadata ------------------------------

test('RSS <link rel="alternate"> present on the homepage', async ({page}) => {
  await page.goto('/');
  const rssLink = page.locator('link[rel="alternate"][type="application/rss+xml"]');
  await expect(rssLink).toHaveAttribute('href', '/rss.xml');
});

test('RSS <link rel="alternate"> present on every post', async ({page}) => {
  for (const slug of postSlugs) {
    await page.goto(`/${slug}`);
    const rssLink = page.locator(
      'link[rel="alternate"][type="application/rss+xml"]',
    );
    await expect(rssLink, `on /${slug}`).toHaveAttribute('href', '/rss.xml');
  }
});

// --- Post structural invariants ------------------------------------------

test('every post has top + bottom "← all posts" back links', async ({page}) => {
  for (const slug of postSlugs) {
    await page.goto(`/${slug}`);
    const backLinks = page.locator('p.back a[href="/"]');
    await expect(backLinks, `on /${slug}`).toHaveCount(2);
    await expect(backLinks.first()).toContainText('all posts');
  }
});

// --- robots.txt advertises the sitemap -----------------------------------

test('robots.txt references the sitemap', async ({page}) => {
  const res = await page.request.get('/robots.txt');
  expect(res.ok()).toBeTruthy();
  const body = await res.text();
  expect(body).toMatch(/^Sitemap:\s+https:\/\/saleh\.soy\/sitemap\.xml/m);
});
