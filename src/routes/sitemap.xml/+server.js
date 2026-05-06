import { posts } from '$lib/posts.js';

export const prerender = true;

const SITE_URL = 'https://saleh.soy';

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function GET() {
  const urls = [
    { loc: `${SITE_URL}/` },
    { loc: `${SITE_URL}/about` },
    ...posts.map((post) => ({ loc: `${SITE_URL}/${post.slug}`, lastmod: post.date }))
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((url) => `  <url>
    <loc>${xmlEscape(url.loc)}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}
  </url>`)
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}
