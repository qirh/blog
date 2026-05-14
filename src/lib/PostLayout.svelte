<script>
  import { page } from '$app/state';

  let { metadata = {}, title = metadata.title, date = metadata.date, children } = $props();

  function normalizeDate(value) {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  let postTitle = $derived(title || metadata.title || 'saleh.soy');
  let postDate = $derived(normalizeDate(date || metadata.date));
  let postUrl = $derived(`https://saleh.soy${page.url.pathname}`);
</script>

<svelte:head>
  <title>{postTitle} — saleh.soy</title>
  <meta name="description" content={`${postTitle} — saleh.soy`} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={postTitle} />
  <meta property="og:url" content={postUrl} />
  <meta property="og:image" content="https://saleh.soy/moi.jpg" />
  <meta property="og:site_name" content="saleh.soy" />
  <meta name="twitter:card" content="summary" />
</svelte:head>

<article>
  <h1>{postTitle}</h1>
  {#if postDate}
    <p class="date"><time datetime={postDate}>{postDate}</time></p>
  {/if}
  <p class="back"><a href="/">← all posts</a></p>
  {@render children?.()}
</article>
<p class="back"><a href="/">← all posts</a></p>
