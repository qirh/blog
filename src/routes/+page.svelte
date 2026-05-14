<script>
  import { posts } from '$lib/posts.js';
</script>

<svelte:head>
  <title>blog</title>
  <meta name="description" content="Saleh's blog" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="saleh.soy" />
  <meta property="og:url" content="https://saleh.soy/" />
  <meta property="og:image" content="https://saleh.soy/moi.jpg" />
  <meta property="og:site_name" content="saleh.soy" />
  <meta name="twitter:card" content="summary" />
</svelte:head>

<ul class="posts">
  {#each posts as post}
    <li>
      <time datetime={post.date}>{post.date}</time>
      <a href="/{post.slug}">{post.title}</a>
    </li>
  {/each}
</ul>
