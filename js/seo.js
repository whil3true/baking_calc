/* Shared SEO metadata for the static BakeCalc site. */
(() => {
  'use strict';

  const BASE_URL = 'https://whil3true.github.io/baking_calc/';
  const pages = {
    'index.html': {
      title: 'BakeCalc — бесплатные калькуляторы для кондитеров',
      description: 'Бесплатные онлайн-калькуляторы для кондитеров: пересчёт рецепта, крем, порции, желатин, единицы и цена продажи.',
      name: 'BakeCalc',
      type: 'website'
    },
    'bakecalc.html': {
      title: 'Пересчёт рецепта и себестоимости | BakeCalc',
      description: 'Пересчитайте рецепт под другую форму, ингредиенты и себестоимость десерта онлайн.',
      name: 'BakeCalc — пересчёт рецепта',
      type: 'tool'
    },
    'creamcalc.html': {
      title: 'Расчёт крема для торта | BakeCalc',
      description: 'Рассчитайте количество крема для прослоек, верха и боков круглого или прямоугольного торта.',
      name: 'CreamCalc',
      type: 'tool'
    },
    'portioncalc.html': {
      title: 'Размер торта по количеству гостей | BakeCalc',
      description: 'Рассчитайте рекомендуемый размер круглого или прямоугольного торта по числу гостей и размеру порции.',
      name: 'Калькулятор порций',
      type: 'tool'
    },
    'gelatincalc.html': {
      title: 'Пересчёт желатина по Bloom | BakeCalc',
      description: 'Пересчитайте количество желатина между разной силой Bloom и рассчитайте воду для гидратации.',
      name: 'GelatinCalc',
      type: 'tool'
    },
    'convertercalc.html': {
      title: 'Конвертер ингредиентов | BakeCalc',
      description: 'Переводите граммы, килограммы, миллилитры и литры, включая массу и объём через плотность ингредиента.',
      name: 'Конвертер ингредиентов',
      type: 'tool'
    },
    'pricecalc.html': {
      title: 'Калькулятор цены продажи десерта | BakeCalc',
      description: 'Рассчитайте цену продажи с учётом себестоимости, работы, комиссии, прибыли, маржи и наценки.',
      name: 'PriceCalc',
      type: 'tool'
    }
  };

  const rawPath = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
  const pageKey = pages[rawPath] ? rawPath : 'index.html';
  const meta = pages[pageKey];
  const canonical = pageKey === 'index.html' ? BASE_URL : `${BASE_URL}${pageKey}`;

  function setMeta(name, content, property = false) {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let element = document.head.querySelector(selector);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(property ? 'property' : 'name', name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  }

  document.title = meta.title;
  setMeta('description', meta.description);
  setMeta('og:title', meta.title, true);
  setMeta('og:description', meta.description, true);
  setMeta('og:type', meta.type === 'website' ? 'website' : 'website', true);
  setMeta('og:url', canonical, true);
  setMeta('twitter:card', 'summary');
  setMeta('twitter:title', meta.title);
  setMeta('twitter:description', meta.description);

  let canonicalLink = document.head.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = canonical;

  const oldStructuredData = document.getElementById('bakecalc-structured-data');
  oldStructuredData?.remove();
  const structuredData = document.createElement('script');
  structuredData.id = 'bakecalc-structured-data';
  structuredData.type = 'application/ld+json';
  structuredData.textContent = JSON.stringify(meta.type === 'website' ? {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BakeCalc',
    url: BASE_URL,
    description: meta.description,
    inLanguage: 'ru'
  } : {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: meta.name,
    url: canonical,
    description: meta.description,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    inLanguage: 'ru',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RUB'
    }
  });
  document.head.appendChild(structuredData);
})();
