(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  function current() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function paint() {
    var cur = current();
    btn.textContent = cur === 'dark' ? '☀' : '☾';
    btn.setAttribute('aria-pressed', cur === 'dark' ? 'true' : 'false');
    btn.setAttribute('aria-label', cur === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  paint();

  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    paint();
  });
})();
