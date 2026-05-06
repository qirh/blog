<script>
  import { page } from '$app/stores';

  export let metadata = {};
  export let title = metadata.title;

  function titleFromPath(pathname) {
    const slug = pathname.split('/').filter(Boolean).pop() || 'blog';
    return slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  $: pageTitle = title || metadata.title || titleFromPath($page.url.pathname);
  $: pageUrl = `https://saleh.soy${$page.url.pathname}`;
</script>

<svelte:head>
  <title>{pageTitle} — saleh.soy</title>
  <meta name="description" content={`${pageTitle} — saleh.soy`} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:image" content="https://saleh.soy/moi.jpg" />
  <meta property="og:site_name" content="saleh.soy" />
</svelte:head>

<slot />
