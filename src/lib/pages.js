import manifest from './pages-manifest.json';

export const pages = [...manifest].sort((a, b) => a.slug.localeCompare(b.slug));
