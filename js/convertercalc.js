/* ConverterCalc page controller. */
(() => {
  'use strict';

  const STORAGE_KEY = 'convertercalc_state_v1';
  const form = document.getElementById('converterForm');
  const results = document.getElementById('converterResults');
  const errors = document.getElementById('converterErrors');
  const status = document.getElementById('converterStatus');

  if (!form || !results || !errors || !status || typeof ConverterCalc === 'undefined') {
    console.error('ConverterCalc initialization failed: required page elements or math module are missing.');
    return;
  }

  const formatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 });
  const number = value => formatter.format(value);
  const field = key => form.elements.namedItem(key);
  let lastCalculation = null;

  function readSettings() {
    const settings = {};
    for (const key of Object.keys(ConverterCalc.defaults)) {
      const input = field(key);
      settings[key] = input && 'value' in input ? input.value : ConverterCalc.defaults[key];
    }
    return settings;
  }

  function applySettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      const input = field(key);
      if (input && 'value' in input) input.value = value;
    }
    syncDensity();
  }

  function syncDensity() {
    const settings = readSettings();
    const needed = ConverterCalc.requiresDensity(settings.fromUnit, settings.toUnit);
    const block = document.getElementById('densityBlock');
    const densityInput = field('density');
    if (block) block.hidden = !needed;
    if (densityInput) densityInput.disabled = !needed;
    const note = document.getElementById('converterModeNote');
    if (note) {
      note.textContent = needed
        ? 'Перевод между массой и объёмом требует плотность ингредиента.'
        : 'Плотность не нужна: перевод выполняется внутри одной физической величины.';
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readSettings()));
    } catch {
      status.textContent = 'Конвертер работает, но браузер не разрешает сохранять параметры.';
    }
  }

  function clearErrors() {
    errors.replaceChildren();
    errors.hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(input => {
      input.removeAttribute('aria-invalid');
      const descriptions = (input.getAttribute('aria-describedby') || '').split(' ')
        .filter(id => id && !id.startsWith('converter-error-'));
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
      item.id = `converter-error-${key}`;
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
    setText('converterResultValue', `${number(r.converted)} ${r.toLabel}`);
    setText('converterSource', `${number(r.amount)} ${r.fromLabel}`);
    setText('converterTarget', `${number(r.converted)} ${r.toLabel}`);
    setText('converterDensity', r.densityNeeded ? `${number(r.density)} г/мл` : 'Не требуется');
    setText('converterSummary', r.densityNeeded
      ? `Перевод ${r.fromLabel} → ${r.toLabel} с плотностью ${number(r.density)} г/мл`
      : `Прямой перевод ${r.fromLabel} → ${r.toLabel}`);
    results.hidden = false;
    status.textContent = 'Конвертация выполнена.';
    results.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    const settings = readSettings();
    const calculation = ConverterCalc.calculate(settings);
    if (!calculation.ok) return showErrors(calculation.errors);
    renderResult(calculation, settings);
    saveSettings();
  });

  form.addEventListener('input', () => {
    invalidate('Параметры изменены. Выполните конвертацию заново.');
    syncDensity();
    saveSettings();
  });

  form.addEventListener('change', () => {
    invalidate('Параметры изменены. Выполните конвертацию заново.');
    syncDensity();
    saveSettings();
  });

  form.addEventListener('reset', event => {
    event.preventDefault();
    applySettings({ ...ConverterCalc.defaults });
    invalidate('Восстановлены начальные параметры конвертера.');
    saveSettings();
  });

  document.getElementById('swapUnits')?.addEventListener('click', () => {
    const from = field('fromUnit');
    const to = field('toUnit');
    if (!from || !to) return;
    [from.value, to.value] = [to.value, from.value];
    invalidate('Единицы поменяны местами. Выполните конвертацию заново.');
    syncDensity();
    saveSettings();
  });

  document.getElementById('copyConverter')?.addEventListener('click', async () => {
    if (!lastCalculation) return;
    const r = lastCalculation.result;
    const text = [
      'KonditerCalc — конвертер ингредиентов',
      `Исходное значение: ${number(r.amount)} ${r.fromLabel}`,
      `Результат: ${number(r.converted)} ${r.toLabel}`,
      r.densityNeeded ? `Плотность: ${number(r.density)} г/мл` : 'Плотность не требуется'
    ].join('\n');
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      status.textContent = 'Результат скопирован.';
    } catch {
      status.textContent = 'Браузер не разрешил автоматическое копирование.';
    }
  });

  let settings = { ...ConverterCalc.defaults };
  try {
    settings = ConverterCalc.restoreSettings(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    status.textContent = 'Сохранённые параметры повреждены. Использованы начальные значения.';
  }
  applySettings(settings);
  window.lucide?.createIcons();
})();
