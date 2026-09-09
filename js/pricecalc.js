/* PriceCalc page controller. */
(() => {
  'use strict';

  const STORAGE_KEY = 'pricecalc_state_v1';
  const form = document.getElementById('priceForm');
  const results = document.getElementById('priceResults');
  const errors = document.getElementById('priceErrors');
  const status = document.getElementById('priceStatus');

  if (!form || !results || !errors || !status || typeof PriceCalc === 'undefined') {
    console.error('PriceCalc initialization failed: required page elements or math module are missing.');
    return;
  }

  const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const money = value => `${moneyFormatter.format(value)} ₽`;
  const number = value => numberFormatter.format(value);
  const field = key => form.elements.namedItem(key);
  let lastCalculation = null;

  function readSettings() {
    const settings = {};
    for (const key of Object.keys(PriceCalc.defaults)) {
      const input = field(key);
      settings[key] = input && 'value' in input ? input.value : PriceCalc.defaults[key];
    }
    return settings;
  }

  function applySettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      const input = field(key);
      if (input && 'value' in input) input.value = value;
    }
    syncTargetMode();
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
        .filter(id => id && !id.startsWith('price-error-'));
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
      item.id = `price-error-${key}`;
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

  function syncTargetMode() {
    const mode = field('targetMode')?.value || 'margin';
    setText('targetValueLabel', mode === 'margin' ? 'Маржа, %' : 'Прибыль, ₽');
    setText('targetHint', mode === 'margin'
      ? 'Маржа = прибыль / цена продажи. Это не то же самое, что наценка.'
      : 'Укажите, сколько рублей чистой прибыли хотите получить после комиссии.');
  }

  function setOptionalRow(rowId, valueId, value, formatter) {
    const row = document.getElementById(rowId);
    if (!row) return;
    row.hidden = value == null;
    if (value != null) setText(valueId, formatter(value));
  }

  function renderResult(calculation, settings) {
    const r = calculation.result;
    lastCalculation = { result: r, settings };
    setText('priceSalePrice', money(r.salePrice));
    setText('priceBaseCost', money(r.baseCost));
    setText('priceLaborCost', money(r.laborCost));
    setText('priceCommission', `${money(r.commissionAmount)} · ${number(r.commissionPercent)}%`);
    setText('priceProfit', money(r.profit));
    setText('priceMargin', `${number(r.marginPercent)}%`);
    setText('priceMarkup', `${number(r.markupPercent)}%`);
    setOptionalRow('pricePerKgRow', 'pricePerKg', r.pricePerKg, value => `${money(value)}/кг`);
    setOptionalRow('pricePerPortionRow', 'pricePerPortion', r.pricePerPortion, value => `${money(value)}/порц.`);
    const targetText = r.targetMode === 'margin'
      ? `целевая маржа ${number(r.targetValue)}%`
      : `целевая прибыль ${money(r.targetValue)}`;
    setText('priceSummary', `${targetText} · комиссия ${number(r.commissionPercent)}%`);
    results.hidden = false;
    status.textContent = 'Расчёт готов. Маржа и наценка показаны отдельно.';
    results.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    const settings = readSettings();
    const calculation = PriceCalc.calculate(settings);
    if (!calculation.ok) return showErrors(calculation.errors);
    renderResult(calculation, settings);
    saveSettings();
  });

  form.addEventListener('input', () => {
    invalidate('Параметры изменены. Выполните расчёт заново.');
    syncTargetMode();
    saveSettings();
  });

  form.addEventListener('change', () => {
    syncTargetMode();
    invalidate('Параметры изменены. Выполните расчёт заново.');
    saveSettings();
  });

  form.addEventListener('reset', event => {
    event.preventDefault();
    applySettings({ ...PriceCalc.defaults });
    invalidate('Восстановлены начальные параметры PriceCalc.');
    saveSettings();
  });

  document.getElementById('copyPrice')?.addEventListener('click', async () => {
    if (!lastCalculation) return;
    const r = lastCalculation.result;
    const lines = [
      'BakeCalc — цена продажи',
      `Базовая себестоимость: ${money(r.baseCost)}`,
      `Работа: ${money(r.laborCost)}`,
      `Комиссия: ${money(r.commissionAmount)} (${number(r.commissionPercent)}%)`,
      `Цена продажи: ${money(r.salePrice)}`,
      `Прибыль: ${money(r.profit)}`,
      `Маржа: ${number(r.marginPercent)}%`,
      `Наценка: ${number(r.markupPercent)}%`
    ];
    if (r.pricePerKg != null) lines.push(`Цена за кг: ${money(r.pricePerKg)}`);
    if (r.pricePerPortion != null) lines.push(`Цена за порцию: ${money(r.pricePerPortion)}`);
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(lines.join('\n'));
      status.textContent = 'Расчёт скопирован.';
    } catch {
      status.textContent = 'Браузер не разрешил автоматическое копирование.';
    }
  });

  let settings = { ...PriceCalc.defaults };
  try {
    settings = PriceCalc.restoreSettings(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    status.textContent = 'Сохранённые параметры повреждены. Использованы начальные значения.';
  }
  applySettings(settings);
  window.lucide?.createIcons();
})();
