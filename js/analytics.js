/* Shared site behavior + Yandex.Metrika. */

/* SEO metadata is centralized so every calculator stays consistent. */
if (!document.querySelector('script[data-bakecalc-seo]')) {
  const seoScript = document.createElement('script');
  seoScript.src = 'js/seo.js';
  seoScript.dataset.bakecalcSeo = 'true';
  document.head.appendChild(seoScript);
}

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

/* Icons are decoration, not a prerequisite for calculations or navigation. */
window.lucide = window.lucide || { createIcons() {} };

/* Planned tools are status cards, not links to the top of the page. */
document.querySelectorAll('a.tool-tile-soon').forEach(card => {
  card.removeAttribute('href');
  card.setAttribute('aria-disabled', 'true');
});

