/* PortionCalc page controller. */
(() => {
  'use strict';

  const STORAGE_KEY = 'portioncalc_state_v1';
  const form = document.getElementById('portionForm');
  const results = document.getElementById('portionResults');
  const errors = document.getElementById('portionErrors');
  const status = document.getElementById('portionStatus');
  const formatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  const number = value => formatter.format(value);
  const field = key => form.elements.namedItem(key);
  let lastCalculation = null;

  function readSettings() {
    return Object.fromEntries(Object.keys(PortionCalc.defaults).map(key => [key, field(key).value]));
  }

  function applySettings(settings) {
    for (const [key, value] of Object.entries(settings)) field(key).value = value;
    syncFields();
  }

  function syncFields() {
    const settings = readSettings();
    document.getElementById('customPortionFields').disabled = settings.portionPreset !== 'custom';
    document.getElementById('customPortionFields').hidden = settings.portionPreset !== 'custom';
    document.getElementById('rectRatioField').disabled = settings.shape !== 'rect';
    document.getElementById('rectRatioField').hidden = settings.shape !== 'rect';
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

  function renderResult(calculation, settings) {
    const r = calculation.result;
    lastCalculation = { result: r, settings };
    document.getElementById('portionRecommendedSize').textContent = sizeText(r);
    document.getElementById('portionTarget').textContent = `${r.targetPortions} порц.`;
    document.getElementById('portionCapacity').textContent = `${r.capacity} порц.`;
    document.getElementById('portionExtra').textContent = `${r.extraPortions} порц.`;
    document.getElementById('portionSlice').textContent = `${number(r.portionWidth)} × ${number(r.portionLength)} см`;
    document.getElementById('portionArea').textContent = `${number(r.requiredArea)} см²`;
    document.getElementById('portionSummary').textContent = `Гостей: ${r.guests} · запас: ${number(r.reserve)}% · порция: ${r.portionLabel.toLowerCase()}`;
    results.hidden = false;
    status.textContent = 'Расчёт готов. Размер округлён вверх, чтобы площади хватило.';
    results.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    const settings = readSettings();
    const calculation = PortionCalc.calculate(settings);
    if (!calculation.ok) return showErrors(calculation.errors);
    renderResult(calculation, settings);
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

  document.getElementById('copyPortion').addEventListener('click', async () => {
    if (!lastCalculation) return;
    const r = lastCalculation.result;
    const text = [
      'BakeCalc — расчёт размера торта по порциям',
      `Гостей: ${r.guests}`,
      `Запас: ${number(r.reserve)}%`,
      `Размер порции: ${number(r.portionWidth)} × ${number(r.portionLength)} см`,
      `Нужно заложить: ${r.targetPortions} порций`,
      `Рекомендуемый размер: ${sizeText(r)}`,
      `Расчётная вместимость: ${r.capacity} порций`,
      '',
      'Расчёт основан на площади нарезки и предполагает ровные вертикальные порции одинакового размера.'
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
