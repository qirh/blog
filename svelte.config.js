import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

const config = {
  extensions: ['.svelte', '.svx', '.md'],
  preprocess: mdsvex({
    extensions: ['.svx', '.md'],
    layout: {
      post: resolve(projectRoot, 'src/lib/PostLayout.svelte'),
      _: resolve(projectRoot, 'src/lib/PageLayout.svelte')
    }
  }),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      precompress: false,
      strict: true
    }),
    prerender: {
      entries: ['*']
    }
  }
};

export default config;
