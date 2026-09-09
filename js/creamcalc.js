/* CreamCalc page controller. BakeCalc keeps its own state and handlers. */
(() => {
  'use strict';
  const STORAGE_KEY = 'creamcalc_state_v1';
  const form = document.getElementById('creamForm');
  const results = document.getElementById('creamResults');
  const errors = document.getElementById('creamErrors');
  const status = document.getElementById('creamStatus');
  const fallback = document.getElementById('creamCopyFallback');
  const formatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  const number = value => formatter.format(value);
  const grams = value => `${number(value)} г`;
  const field = key => form.elements.namedItem(key);
  let lastCalculation = null;

  function readSettings() {
    return Object.fromEntries(Object.keys(CreamCalc.defaults).map(key => [key,
      typeof CreamCalc.defaults[key] === 'boolean' ? field(key).checked : field(key).value
    ]));
  }

  function applySettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'boolean') field(key).checked = value;
      else field(key).value = value;
    }
    syncFields();
  }

  function syncFields() {
    const settings = readSettings();
    for (const [id, enabled, hide] of [
      ['circleFields', settings.shape === 'circle', true],
      ['rectFields', settings.shape === 'rect', true],
      ['fillingFields', CreamCalc.parseNumber(settings.layers) !== 0, false],
      ['topFields', settings.coverTop, false],
      ['sideFields', settings.coverSides, false],
      ['coatingFields', settings.coverTop || settings.coverSides, false]
    ]) {
      const group = document.getElementById(id);
      group.disabled = !enabled;
      if (hide) group.hidden = !enabled;
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readSettings()));
    } catch {
      status.textContent = 'Расчёт работает, но браузер не разрешает сохранять параметры между посещениями.';
    }
  }

  function clearErrors() {
    errors.replaceChildren();
    errors.hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(input => {
      input.removeAttribute('aria-invalid');
      const descriptions = (input.getAttribute('aria-describedby') || '').split(' ')
        .filter(id => id && !id.startsWith('cream-error-'));
      if (descriptions.length) input.setAttribute('aria-describedby', descriptions.join(' '));
      else input.removeAttribute('aria-describedby');
    });
  }

  function invalidate(message = '') {
    lastCalculation = null;
    results.hidden = true;
    fallback.hidden = true;
    document.getElementById('creamCopyText').value = '';
    status.textContent = message;
    clearErrors();
  }

  function showErrors(messages) {
    const title = document.createElement('p');
    title.textContent = 'Проверьте параметры:';
    const list = document.createElement('ul');
    for (const [key, message] of Object.entries(messages)) {
      const item = document.createElement('li');
      item.id = `cream-error-${key}`;
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

  function cakeSummary(settings) {
    const value = key => number(CreamCalc.parseNumber(settings[key]));
    const shape = settings.shape === 'circle' ? `Круглый торт Ø ${value('diameter')} см` : `Прямоугольный торт ${value('length')} × ${value('width')} см`;
    return `${shape} · высота ${value('height')} см · прослоек: ${value('layers')}`;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    const settings = readSettings();
    const calculation = CreamCalc.calculate(settings);
    if (!calculation.ok) {
      showErrors(calculation.errors);
      return;
    }
    lastCalculation = { settings, result: calculation.result };
    const result = calculation.result;
    for (const key of ['filling', 'sides', 'top', 'subtotal', 'reserve', 'total', 'prepare']) {
      document.getElementById(`cream${key[0].toUpperCase()}${key.slice(1)}`).textContent = grams(result[key]);
    }
    document.getElementById('creamReserveLabel').textContent = `Запас (${number(CreamCalc.parseNumber(settings.reserve))}%)`;
    document.getElementById('creamCakeSummary').textContent = cakeSummary(settings);
    results.hidden = false;
    status.textContent = 'Расчёт готов. Параметры сохраняются в этом браузере.';
    saveSettings();
    results.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  form.addEventListener('input', () => {
    invalidate('Параметры изменены. Нажмите «Рассчитать крем».');
    syncFields();
    saveSettings();
  });

  form.addEventListener('reset', event => {
    event.preventDefault();
    applySettings({ ...CreamCalc.defaults });
    invalidate('Восстановлены начальные параметры CreamCalc.');
    saveSettings();
  });

  function calculationText({ settings, result }) {
    const value = key => number(CreamCalc.parseNumber(settings[key]));
    const lines = ['CreamCalc — расчёт крема', cakeSummary(settings)];
    if (CreamCalc.parseNumber(settings.layers) > 0) lines.push(`Прослойка: ${value('fillingThickness')} мм; плотность: ${value('fillingDensity')} г/мл`);
    lines.push(`Верх: ${settings.coverTop ? `${value('topThickness')} мм` : 'без покрытия'}`);
    lines.push(`Бока: ${settings.coverSides ? `${value('sideThickness')} мм` : 'без покрытия'}`);
    if (settings.coverTop || settings.coverSides) lines.push(`Плотность покрытия: ${value('coatingDensity')} г/мл`);
    lines.push('', `Между коржами: ${grams(result.filling)}`, `На бока: ${grams(result.sides)}`, `На верх: ${grams(result.top)}`,
      `Без запаса: ${grams(result.subtotal)}`, `Запас ${value('reserve')}%: ${grams(result.reserve)}`, `Итого с запасом: ${grams(result.total)}`,
      `Подготовьте: ${grams(result.prepare)} (округлено вверх до 10 г)`, '',
      'Оценка для ровных слоёв. Дно, начинки и крупный декор не учтены. Плотность 1 г/мл — исходное допущение, уточните её для вашего крема.');
    return lines.join('\n');
  }

  document.getElementById('copyCream').addEventListener('click', async () => {
    if (!lastCalculation) return;
    const text = calculationText(lastCalculation);
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      fallback.hidden = true;
      status.textContent = 'Расчёт скопирован.';
    } catch {
      fallback.hidden = false;
      const textarea = document.getElementById('creamCopyText');
      textarea.value = text;
      textarea.focus();
      textarea.select();
      status.textContent = 'Браузер не разрешил копирование. Выделенный текст можно скопировать вручную.';
    }
  });

  let settings = { ...CreamCalc.defaults };
  try {
    settings = CreamCalc.restoreSettings(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    status.textContent = 'Сохранённые параметры недоступны. Использованы начальные значения.';
  }
  applySettings(settings);
  window.lucide?.createIcons();
})();
