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

/* BakeCalc legacy page still initializes from app.js on DOMContentLoaded.
   Load its reliability layer synchronously while the document is parsing so
   the hardened handlers replace the legacy ones before that event fires. */
if (document.getElementById('recipeNameInput')) {
  document.write('<script src="js/bakecalc-math.js"><\\/script><script src="js/bakecalc-hardening.js"><\\/script>');
}
