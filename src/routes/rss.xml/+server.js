import { posts } from '$lib/posts.js';

export const prerender = true;

const SITE_URL = 'https://saleh.soy';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function rfc822(date) {
  const value = new Date(`${date}T00:00:00Z`);
  const day = String(value.getUTCDate()).padStart(2, '0');
  const year = value.getUTCFullYear();
  return `${WEEKDAYS[value.getUTCDay()]}, ${day} ${MONTHS[value.getUTCMonth()]} ${year} 00:00:00 +0000`;
}

export function GET() {
  const buildDate = rfc822(new Date().toISOString().slice(0, 10));
  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/${post.slug}`;
      return `  <item>
    <title>${xmlEscape(post.title)}</title>
    <link>${url}</link>
    <guid>${url}</guid>
    <pubDate>${rfc822(post.date)}</pubDate>
    <description>${xmlEscape(post.excerpt)}</description>
  </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>saleh.soy</title>
  <link>${SITE_URL}/</link>
  <description>Saleh's blog</description>
  <language>en-us</language>
  <lastBuildDate>${buildDate}</lastBuildDate>
${items}
</channel>
</rss>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}
