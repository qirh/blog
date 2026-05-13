#!/usr/bin/env node
// Production-vs-preview parity check. Two modes, both run by default:
//
//   - http     : status code, Location header (3xx), and Content-Type for
//                every URL. Catches routing/redirect/content-type drift —
//                the trailing-slash rewrite, robots.txt, etc. Intended for
//                deploy-preview comparison (both sides go through Netlify's
//                edge); against a local `vite preview` it will surface
//                spurious differences in static-file MIME guesses and
//                Netlify-only rewrites (trailing-slash, etc.).
//   - content  : structured HTML signals (titles, OG tags, post bodies as
//                plain text, RSS items, sitemap loc list). Catches
//                pandoc-vs-mdsvex rendering drift. Safe against any preview
//                (local or deploy).
//
// Whitespace and attribute order are normalized away. Known acceptable drift
// (RSS excerpt text, host-specific URLs) is allowlisted.
//
// Usage:
//   npm run test:parity -- --mode=content                     # local preview check
//   PREVIEW_URL=https://deploy-preview-10--salehsoy.netlify.app npm run test:parity
//   PROD_URL=https://saleh.soy PREVIEW_URL=... npm run test:parity

import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const PROD_URL = (process.env.PROD_URL || 'https://saleh.soy').replace(/\/$/, '');
const PREVIEW_URL = (process.env.PREVIEW_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');

const argMode = (process.argv.find((a) => a.startsWith('--mode=')) || '--mode=all').split('=')[1];
const runHttp = argMode === 'all' || argMode === 'http';
const runContent = argMode === 'all' || argMode === 'content';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const postSlugs = readdirSync(join(repoRoot, 'posts'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .sort();
const pageSlugs = readdirSync(join(repoRoot, 'pages'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .sort();

const contentTargets = [
  {path: '/', kind: 'index'},
  ...pageSlugs.map((slug) => ({path: `/${slug}`, kind: 'page'})),
  ...postSlugs.map((slug) => ({path: `/${slug}`, kind: 'post', slug})),
  {path: '/rss.xml', kind: 'rss'},
  {path: '/sitemap.xml', kind: 'sitemap'}
];

// HTTP-mode targets cover everything content-mode hits plus a few that are
// routing-only (no HTML body to extract from): static assets, robots.txt,
// the trailing-slash rewrite, and a known-404 sanity check.
const httpTargets = [
  ...contentTargets.map((t) => t.path),
  '/style.css',
  '/theme.js',
  '/moi.jpg',
  '/alien_blue.ico',
  '/robots.txt',
  '/funny-week/',                          // 200-rewrite from netlify.toml
  '/this-route-should-never-exist'         // expected 404 on both
];

async function fetchText(url) {
  const res = await fetch(url, {redirect: 'follow'});
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

async function fetchHead(url) {
  // Use GET with no body read so we capture status + headers without following
  // redirects, mirroring sala_v2's parity_test.sh approach.
  const res = await fetch(url, {method: 'GET', redirect: 'manual'});
  return {
    status: res.status,
    location: res.headers.get('location') || '',
    contentType: (res.headers.get('content-type') || '').split(';')[0].trim()
  };
}

// HTML helpers — regex-based on purpose. We're extracting a small set of
// well-formed tags emitted by both pandoc and SvelteKit. A full DOM parser
// would be more correct but adds dependency weight for no real gain.

function meta(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i');
  const m = html.match(re);
  // Pandoc's template wraps long meta content across lines; mdsvex emits flat.
  // Collapse whitespace so both compare equal — same logical content either way.
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function title(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].trim() : null;
}

function h1(html) {
  const m = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  return m ? m[1].trim() : null;
}

function articleText(html) {
  // Pull the <article>...</article> region, strip tags, collapse whitespace.
  const m = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (!m) return null;
  return m[1]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function bodyText(html) {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (!m) return null;
  return m[1]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function indexLinks(html) {
  const re = /<a\s+href=["']\/([\w-]+)["']/gi;
  const slugs = new Set();
  let m;
  while ((m = re.exec(html))) slugs.add(m[1]);
  slugs.delete('about'); // nav link, not a post entry
  return [...slugs].sort();
}

function indexDates(html) {
  const re = /<time\s+datetime=["'](\d{4}-\d{2}-\d{2})["']/gi;
  const dates = [];
  let m;
  while ((m = re.exec(html))) dates.push(m[1]);
  return dates;
}

function rssSignals(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const block = m[1];
    return {
      title: (block.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1].trim(),
      link: (block.match(/<link>([\s\S]*?)<\/link>/) || [, ''])[1].trim(),
      guid: (block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) || [, ''])[1].trim(),
      pubDate: (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [, ''])[1].trim(),
      isPermaLink: /<guid[^>]+isPermaLink=["']true["']/.test(block)
    };
  });
  items.sort((a, b) => a.guid.localeCompare(b.guid));
  return {
    channelTitle: (xml.match(/<channel>[\s\S]*?<title>([\s\S]*?)<\/title>/) || [, ''])[1].trim(),
    channelLink: (xml.match(/<channel>[\s\S]*?<link>([\s\S]*?)<\/link>/) || [, ''])[1].trim(),
    itemCount: items.length,
    items
  };
}

function sitemapSignals(xml) {
  const locs = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((m) => m[1].trim()).sort();
  return {locCount: locs.length, locs};
}

function postSignals(html) {
  return {
    title: title(html),
    h1: h1(html),
    ogTitle: meta(html, 'og:title'),
    ogType: meta(html, 'og:type'),
    ogSiteName: meta(html, 'og:site_name'),
    twitterCard: meta(html, 'twitter:card'),
    articleText: articleText(html)
  };
}

function pageSignals(html) {
  return {
    title: title(html),
    ogTitle: meta(html, 'og:title'),
    ogSiteName: meta(html, 'og:site_name'),
    bodyText: bodyText(html)
  };
}

function indexSignals(html) {
  return {
    title: title(html),
    description: meta(html, 'description'),
    ogTitle: meta(html, 'og:title'),
    ogSiteName: meta(html, 'og:site_name'),
    postSlugs: indexLinks(html),
    postDates: indexDates(html)
  };
}

// Normalize host-specific URLs so a saleh.soy URL on prod compares equal to a
// saleh.soy URL on the preview output (the new endpoints hard-code saleh.soy
// in OG/canonical fields, which is correct — Phase 2 will re-target).
function normalize(value, urlBase) {
  if (value == null) return value;
  if (typeof value === 'string') return value.split(urlBase).join('https://saleh.soy');
  if (Array.isArray(value)) return value.map((v) => normalize(v, urlBase));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v, urlBase);
    return out;
  }
  return value;
}

// Fields we accept as drift between prod and preview.
const allowlist = {
  index: [],
  page: [],
  post: ['articleText'], // pandoc-to-mdsvex whitespace/escape drift; spot-check manually
  rss: ['items.[].pubDate', 'items.[].title', 'items.[].guid', 'items.[].link', 'items.[].isPermaLink'],
  sitemap: []
};

function projectExcept(obj, paths) {
  const blocked = new Set(paths);
  const project = (v, prefix) => {
    if (blocked.has(prefix)) return undefined;
    if (Array.isArray(v)) {
      const arrPrefix = `${prefix}.[]`;
      if (blocked.has(arrPrefix)) return undefined;
      return v.map((item) => project(item, arrPrefix));
    }
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        const nextPrefix = prefix ? `${prefix}.${k}` : k;
        const next = project(val, nextPrefix);
        if (next !== undefined) out[k] = next;
      }
      return out;
    }
    return v;
  };
  return project(obj, '');
}

async function checkContent(target) {
  const prodUrl = `${PROD_URL}${target.path}`;
  const previewUrl = `${PREVIEW_URL}${target.path}`;
  let prodBody, previewBody;
  try {
    [prodBody, previewBody] = await Promise.all([fetchText(prodUrl), fetchText(previewUrl)]);
  } catch (err) {
    return {target, error: err.message};
  }

  const extractor = {
    index: indexSignals,
    page: pageSignals,
    post: postSignals,
    rss: rssSignals,
    sitemap: sitemapSignals
  }[target.kind];

  let prodSig = normalize(extractor(prodBody), PROD_URL);
  let previewSig = normalize(extractor(previewBody), PREVIEW_URL);
  const dropped = allowlist[target.kind] || [];
  prodSig = projectExcept(prodSig, dropped);
  previewSig = projectExcept(previewSig, dropped);

  const prodJson = JSON.stringify(prodSig, null, 2);
  const previewJson = JSON.stringify(previewSig, null, 2);
  if (prodJson === previewJson) return {target, ok: true};
  return {target, ok: false, prod: prodJson, preview: previewJson};
}

async function checkHttp(path) {
  let prod, preview;
  try {
    [prod, preview] = await Promise.all([fetchHead(`${PROD_URL}${path}`), fetchHead(`${PREVIEW_URL}${path}`)]);
  } catch (err) {
    return {path, error: err.message};
  }
  // Normalize Location absolute URLs so host doesn't false-trigger drift.
  const normLoc = (loc, base) => loc.split(base).join('https://saleh.soy');
  prod = {...prod, location: normLoc(prod.location, PROD_URL)};
  preview = {...preview, location: normLoc(preview.location, PREVIEW_URL)};
  const drift = [];
  if (prod.status !== preview.status) drift.push(`status ${prod.status} → ${preview.status}`);
  if (prod.location !== preview.location) drift.push(`location ${prod.location || '(none)'} → ${preview.location || '(none)'}`);
  if (prod.contentType !== preview.contentType) drift.push(`content-type ${prod.contentType} → ${preview.contentType}`);
  return drift.length ? {path, ok: false, drift, prod, preview} : {path, ok: true, status: prod.status};
}

let failed = 0;
let passed = 0;

if (runHttp) {
  console.log('— HTTP mode (status, location, content-type) —');
  for (const path of httpTargets) {
    // eslint-disable-next-line no-await-in-loop
    const r = await checkHttp(path);
    if (r.error) {
      failed++;
      console.error(`FAIL ${r.path} — fetch error: ${r.error}`);
    } else if (r.ok) {
      passed++;
      console.log(`  ✓ ${r.path} (${r.status})`);
    } else {
      failed++;
      console.error(`FAIL ${r.path}`);
      for (const d of r.drift) console.error(`    ${d}`);
    }
  }
  console.log();
}

if (runContent) {
  console.log('— Content mode (HTML/RSS/sitemap signals) —');
  for (const target of contentTargets) {
    // eslint-disable-next-line no-await-in-loop
    const r = await checkContent(target);
    if (r.error) {
      failed++;
      console.error(`FAIL ${r.target.path} — fetch error: ${r.error}`);
    } else if (r.ok) {
      passed++;
      console.log(`  ✓ ${r.target.path} (${r.target.kind})`);
    } else {
      failed++;
      console.error(`FAIL ${r.target.path} (${r.target.kind})`);
      console.error('  prod signals:');
      console.error(r.prod.split('\n').map((l) => `    ${l}`).join('\n'));
      console.error('  preview signals:');
      console.error(r.preview.split('\n').map((l) => `    ${l}`).join('\n'));
    }
  }
  console.log();
}

if (failed) {
  console.error(`PARITY FAIL: ${failed} of ${passed + failed} checks drifted`);
  process.exit(1);
}
console.log(`PARITY PASS: ${passed} checks match production`);
