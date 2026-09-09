/* GelatinCalc page controller. */
(() => {
  'use strict';

  const STORAGE_KEY = 'gelatincalc_state_v1';
  const form = document.getElementById('gelatinForm');
  const results = document.getElementById('gelatinResults');
  const errors = document.getElementById('gelatinErrors');
  const status = document.getElementById('gelatinStatus');

  if (!form || !results || !errors || !status || typeof GelatinCalc === 'undefined') {
    console.error('GelatinCalc initialization failed: required page elements or math module are missing.');
    return;
  }

  const formatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const number = value => formatter.format(value);
  const grams = value => `${number(value)} г`;
  const field = key => form.elements.namedItem(key);
  let lastCalculation = null;

  function readSettings() {
    const settings = {};
    for (const key of Object.keys(GelatinCalc.defaults)) {
      const input = field(key);
      settings[key] = input && 'value' in input ? input.value : GelatinCalc.defaults[key];
    }
    return settings;
  }

  function applySettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      const input = field(key);
      if (input && 'value' in input) input.value = value;
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readSettings()));
    } catch {
      status.textContent = 'Расчёт работает, но браузер не разрешает сохранять параметры.';
    }
  }

  function clearErrors() {
    errors.replaceChildren();
    errors.hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(input => {
      input.removeAttribute('aria-invalid');
      const descriptions = (input.getAttribute('aria-describedby') || '').split(' ')
        .filter(id => id && !id.startsWith('gelatin-error-'));
      if (descriptions.length) input.setAttribute('aria-describedby', descriptions.join(' '));
      else input.removeAttribute('aria-describedby');
    });
  }

  function invalidate(message = '') {
    lastCalculation = null;
    results.hidden = true;
    status.textContent = message;
    clearErrors();
  }

  function showErrors(messages) {
    const title = document.createElement('p');
    title.textContent = 'Проверьте параметры:';
    const list = document.createElement('ul');
    for (const [key, message] of Object.entries(messages)) {
      const item = document.createElement('li');
      item.id = `gelatin-error-${key}`;
      item.textContent = message;
      list.appendChild(item);
      const input = document.getElementById(key);
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), item.id].filter(Boolean).join(' '));
      }
    }
    errors.replaceChildren(title, list);
    errors.hidden = false;
    errors.focus();
  }

  function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  function renderResult(calculation, settings) {
    const r = calculation.result;
    lastCalculation = { result: r, settings };
    setText('gelatinConverted', grams(r.convertedWeight));
    setText('gelatinWater', grams(r.waterWeight));
    setText('gelatinMass', grams(r.gelatinMass));
    setText('gelatinSource', `${number(r.recipeWeight)} г · ${number(r.recipeBloom)} Bloom`);
    setText('gelatinTarget', `${number(r.availableBloom)} Bloom`);
    setText('gelatinRatio', `1:${number(r.waterRatio)}`);
    setText('gelatinSummary', `Из ${number(r.recipeBloom)} Bloom в ${number(r.availableBloom)} Bloom · коэффициент массы ×${number(r.strengthFactor)}`);
    results.hidden = false;
    status.textContent = 'Расчёт готов. Пересчёт Bloom является приближённым ориентиром.';
    results.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    const settings = readSettings();
    const calculation = GelatinCalc.calculate(settings);
    if (!calculation.ok) return showErrors(calculation.errors);
    renderResult(calculation, settings);
    saveSettings();
  });

  form.addEventListener('input', () => {
    invalidate('Параметры изменены. Выполните расчёт заново.');
    saveSettings();
  });

  form.addEventListener('reset', event => {
    event.preventDefault();
    applySettings({ ...GelatinCalc.defaults });
    invalidate('Восстановлены начальные параметры GelatinCalc.');
    saveSettings();
  });

  document.getElementById('copyGelatin')?.addEventListener('click', async () => {
    if (!lastCalculation) return;
    const r = lastCalculation.result;
    const text = [
      'GelatinCalc — пересчёт желатина',
      `В рецепте: ${number(r.recipeWeight)} г, ${number(r.recipeBloom)} Bloom`,
      `Ваш желатин: ${number(r.availableBloom)} Bloom`,
      `Использовать желатина: ${grams(r.convertedWeight)}`,
      `Вода для гидратации 1:${number(r.waterRatio)}: ${grams(r.waterWeight)}`,
      `Желатиновая масса: ${grams(r.gelatinMass)}`,
      '',
      'Пересчёт Bloom приблизительный; точная текстура зависит от продукта и технологии.'
    ].join('\n');
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      status.textContent = 'Расчёт скопирован.';
    } catch {
      status.textContent = 'Браузер не разрешил автоматическое копирование.';
    }
  });

  let settings = { ...GelatinCalc.defaults };
  try {
    settings = GelatinCalc.restoreSettings(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    status.textContent = 'Сохранённые параметры повреждены. Использованы начальные значения.';
  }
  applySettings(settings);
  window.lucide?.createIcons();
})();
