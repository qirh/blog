<script>
  import { page } from '$app/stores';

  export let metadata = {};
  export let title = metadata.title;
  export let date = metadata.date;

  function normalizeDate(value) {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  $: postTitle = title || metadata.title || 'saleh.soy';
  $: postDate = normalizeDate(date || metadata.date);
  $: postUrl = `https://saleh.soy${$page.url.pathname}`;
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
  <slot />
</article>
<p class="back"><a href="/">← all posts</a></p>
