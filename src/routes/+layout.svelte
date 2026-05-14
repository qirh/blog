<svelte:head>
  <link rel="stylesheet" href="/style.css" />
  <link rel="icon" href="/alien_blue.ico" />
  <link rel="alternate" type="application/rss+xml" title="saleh.soy RSS" href="/rss.xml" />
  <script>
    (function () {
      try {
        var t = localStorage.getItem('theme');
        if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
      } catch (e) {}
    })();
  </script>
  <script src="/theme.js" defer></script>
</svelte:head>

<header>
  <a class="site" href="/">saleh.soy</a>
  <nav>
    <a href="/about">about</a>
    <button id="theme-toggle" type="button" aria-label="Toggle color theme">☾</button>
  </nav>
</header>
<main>
  <slot />
</main>
