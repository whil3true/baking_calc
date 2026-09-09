/* Yandex.Metrika */
(function (m, e, t, r, i, k, a) {
  m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
  m[i].l = 1 * new Date();
  for (var j = 0; j < document.scripts.length; j++) {
    if (document.scripts[j].src === r) return;
  }
  k = e.createElement(t);
  a = e.getElementsByTagName(t)[0];
  k.async = 1;
  k.src = r;
  a.parentNode.insertBefore(k, a);
})(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=112356971', 'ym');

ym(112356971, 'init', {
  ssr: true,
  webvisor: true,
  clickmap: true,
  referrer: document.referrer,
  url: location.href,
  accurateTrackBounce: true,
  trackLinks: true
});

/* The legacy BakeCalc page keeps its UI in app.js. Load its pure math and
   reliability layer only on that page. The hardening layer is safe whether
   DOMContentLoaded has already fired or not. */
if (document.getElementById('recipeNameInput')) {
  const mathScript = document.createElement('script');
  mathScript.src = 'js/bakecalc-math.js';
  mathScript.onload = () => {
    const hardeningScript = document.createElement('script');
    hardeningScript.src = 'js/bakecalc-hardening.js';
    document.head.appendChild(hardeningScript);
  };
  document.head.appendChild(mathScript);
}
