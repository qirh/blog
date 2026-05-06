import manifest from './posts-manifest.json';

export const posts = [...manifest].sort((a, b) => b.date.localeCompare(a.date));
