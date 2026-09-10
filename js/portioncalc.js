/* PortionCalc page controller. */
(() => {
  'use strict';

  const STORAGE_KEY = 'portioncalc_state_v2';
  const form = document.getElementById('portionForm');
  const results = document.getElementById('portionResults');
  const errors = document.getElementById('portionErrors');
  const status = document.getElementById('portionStatus');

  if (!form || !results || !errors || !status || typeof PortionCalc === 'undefined') {
    console.error('PortionCalc initialization failed: required page elements or math module are missing.');
    return;
  }

  const formatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  const number = value => formatter.format(value);
  const field = key => form.elements.namedItem(key);
  let lastCalculation = null;

  function readSettings() {
    const settings = {};
    for (const key of Object.keys(PortionCalc.defaults)) {
      const input = field(key);
      if (!input) {
        settings[key] = PortionCalc.defaults[key];
      } else if (input instanceof RadioNodeList) {
        settings[key] = input.value || PortionCalc.defaults[key];
      } else if ('value' in input) {
        settings[key] = input.value;
      } else {
        settings[key] = PortionCalc.defaults[key];
      }
    }
    return settings;
  }

  function applySettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      const input = field(key);
      if (!input) continue;
      if (input instanceof RadioNodeList) {
        const option = Array.from(input).find(item => item.value === value);
        if (option) option.checked = true;
      } else if ('value' in input) {
        input.value = value;
      }
    }
    syncFields();
  }

  function syncFields() {
    const settings = readSettings();
    const round = settings.shape === 'circle';
    document.getElementById('roundShapeCard')?.classList.toggle('portion-shape-active', round);
    document.getElementById('rectShapeCard')?.classList.toggle('portion-shape-active', !round);
    const previewTitle = document.getElementById('portionPieceTitle');
    const previewText = document.getElementById('portionPieceText');
    const roundPiece = document.getElementById('roundPiecePreview');
    const rectPiece = document.getElementById('rectPiecePreview');
    if (previewTitle) previewTitle.textContent = round ? 'Клиновидный кусочек' : 'Прямоугольный кусочек';
    if (previewText) previewText.textContent = round
      ? 'Укажите длину клина от центра к краю и его ширину по внешнему краю.'
      : 'Укажите длину и ширину одного прямоугольного кусочка.';
    if (roundPiece) roundPiece.hidden = !round;
    if (rectPiece) rectPiece.hidden = round;
    const lengthLabel = document.getElementById('portionLengthLabel');
    const widthLabel = document.getElementById('portionWidthLabel');
    if (lengthLabel) lengthLabel.textContent = round ? 'Длина клина, см' : 'Длина кусочка, см';
    if (widthLabel) widthLabel.textContent = round ? 'Ширина клина, см' : 'Ширина кусочка, см';
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
        .filter(id => id && !id.startsWith('portion-error-'));
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
      item.id = `portion-error-${key}`;
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

  function sizeText(result) {
    return result.shape === 'circle'
      ? `Ø ${number(result.diameter)} см`
      : `${number(result.length)} × ${number(result.width)} см`;
  }

  function cutText(result) {
    return result.cutType === 'wedge' ? 'Клиновидная' : 'Сеткой';
  }

  function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  function renderResult(calculation) {
    const r = calculation.result;
    lastCalculation = r;
    setText('portionRecommendedSize', sizeText(r));
    setText('portionTarget', `${r.targetPortions} порц.`);
    setText('portionCapacity', `${r.capacity} порц.`);
    setText('portionExtra', `${r.extraPortions} порц.`);
    setText('portionSlice', `${number(r.portionLength)} × ${number(r.portionWidth)} см`);
    setText('portionCut', cutText(r));
    setText('portionArea', `${number(r.requiredArea)} см²`);
    setText('portionSummary', `Гостей: ${r.guests} · запас: ${number(r.reserve)}% · нарезка: ${cutText(r).toLowerCase()}`);
    results.hidden = false;
    status.textContent = 'Расчёт готов. Размер торта подобран автоматически.';
    results.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    const settings = readSettings();
    const calculation = PortionCalc.calculate(settings);
    if (!calculation.ok) return showErrors(calculation.errors);
    renderResult(calculation);
    saveSettings();
  });

  form.addEventListener('input', () => {
    invalidate('Параметры изменены. Выполните расчёт заново.');
    syncFields();
    saveSettings();
  });

  form.addEventListener('reset', event => {
    event.preventDefault();
    applySettings({ ...PortionCalc.defaults });
    invalidate('Восстановлены начальные параметры калькулятора порций.');
    saveSettings();
  });

  document.getElementById('copyPortion')?.addEventListener('click', async () => {
    if (!lastCalculation) return;
    const r = lastCalculation;
    const text = [
      'KonditerCalc — расчёт размера торта по порциям',
      `Форма: ${r.shape === 'circle' ? 'круглая' : 'прямоугольная'}`,
      `Кусочек: ${number(r.portionLength)} × ${number(r.portionWidth)} см`,
      `Нарезка: ${cutText(r).toLowerCase()}`,
      `Гостей: ${r.guests}`,
      `Запас: ${number(r.reserve)}%`,
      `Нужно заложить: ${r.targetPortions} порций`,
      `Рекомендуемый размер торта: ${sizeText(r)}`,
      `Расчётная вместимость: ${r.capacity} порций`
    ].join('\n');
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      status.textContent = 'Расчёт скопирован.';
    } catch {
      status.textContent = 'Браузер не разрешил автоматическое копирование.';
    }
  });

  let settings = { ...PortionCalc.defaults };
  try {
    settings = PortionCalc.restoreSettings(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    status.textContent = 'Сохранённые параметры повреждены. Использованы начальные значения.';
  }
  applySettings(settings);
  window.lucide?.createIcons();
})();
