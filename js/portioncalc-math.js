/* Pure PortionCalc calculations, shared by browser and Node tests. */
const PortionCalc = (() => {
  'use strict';

  const defaults = Object.freeze({
    guests: '20',
    reserve: '10',
    shape: 'circle',
    portionPreset: 'standard',
    portionWidth: '5',
    portionLength: '10',
    rectRatio: '1.5'
  });

  const presets = Object.freeze({
    small: Object.freeze({ width: 4, length: 8, label: 'Небольшая' }),
    standard: Object.freeze({ width: 5, length: 10, label: 'Стандартная' }),
    large: Object.freeze({ width: 6, length: 10, label: 'Большая' })
  });

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    const text = value.trim().replace(',', '.');
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return NaN;
    const number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function roundUpCentimeter(value) {
    return Number.isFinite(value) ? Math.ceil(value) : NaN;
  }

  function restoreSettings(saved) {
    const settings = { ...defaults };
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return settings;
    for (const key of Object.keys(defaults)) {
      const value = saved[key];
      if (key === 'shape') {
        if (value === 'circle' || value === 'rect') settings[key] = value;
      } else if (key === 'portionPreset') {
        if (value === 'small' || value === 'standard' || value === 'large' || value === 'custom') settings[key] = value;
      } else if (typeof value === 'string' && value.length <= 32) {
        settings[key] = value;
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        settings[key] = String(value);
      }
    }
    return settings;
  }

  function portionDimensions(input, errors, values) {
    if (input.portionPreset && input.portionPreset !== 'custom') {
      const preset = presets[input.portionPreset];
      if (!preset) {
        errors.portionPreset = 'Выберите размер порции.';
        return null;
      }
      values.portionWidth = preset.width;
      values.portionLength = preset.length;
      return preset;
    }
    const width = parseNumber(input.portionWidth);
    const length = parseNumber(input.portionLength);
    if (!Number.isFinite(width) || width <= 0 || width > 30) errors.portionWidth = 'Ширина ориентира порции: введите число больше 0 и до 30 см.';
    if (!Number.isFinite(length) || length <= 0 || length > 30) errors.portionLength = 'Длина ориентира порции: введите число больше 0 и до 30 см.';
    values.portionWidth = width;
    values.portionLength = length;
    return { width, length, label: 'Своя' };
  }

  function calculate(input) {
    const errors = {};
    const values = {};
    if (!input || typeof input !== 'object') return { ok: false, errors: { form: 'Введите параметры расчёта.' } };

    const guests = parseNumber(input.guests);
    if (!Number.isFinite(guests) || guests <= 0 || !Number.isInteger(guests) || guests > 1000) {
      errors.guests = 'Количество гостей: введите целое число от 1 до 1000.';
    }

    const reserve = parseNumber(input.reserve);
    if (!Number.isFinite(reserve) || reserve < 0 || reserve > 100) errors.reserve = 'Запас: введите значение от 0 до 100%.';
    if (input.shape !== 'circle' && input.shape !== 'rect') errors.shape = 'Выберите форму торта.';

    const portion = portionDimensions(input, errors, values);
    let ratio = 1;
    if (input.shape === 'rect') {
      ratio = parseNumber(input.rectRatio);
      if (!Number.isFinite(ratio) || ratio < 1 || ratio > 5) errors.rectRatio = 'Соотношение сторон: введите число от 1 до 5.';
    }
    if (Object.keys(errors).length) return { ok: false, errors };

    const portionArea = portion.width * portion.length;
    const targetPortions = Math.ceil(guests * (1 + reserve / 100));
    const requiredArea = portionArea * targetPortions;
    let result;

    if (input.shape === 'circle') {
      const rawDiameter = 2 * Math.sqrt(requiredArea / Math.PI);
      const diameter = roundUpCentimeter(rawDiameter);
      const actualArea = Math.PI * Math.pow(diameter / 2, 2);
      const capacity = Math.floor(actualArea / portionArea + 1e-9);
      result = { shape: 'circle', cutType: 'wedge', rawDiameter, diameter, actualArea, capacity };
    } else {
      const rawWidth = Math.sqrt(requiredArea / ratio);
      const rawLength = rawWidth * ratio;
      let width = roundUpCentimeter(rawWidth);
      let length = roundUpCentimeter(rawLength);
      let actualArea = width * length;
      while (actualArea + 1e-9 < requiredArea) {
        length += 1;
        actualArea = width * length;
      }
      const capacity = Math.floor(actualArea / portionArea + 1e-9);
      result = { shape: 'rect', cutType: 'grid', rawWidth, rawLength, width, length, actualArea, capacity, ratio };
    }

    const resultValues = {
      ...result, guests, reserve, portionArea,
      portionWidth: portion.width, portionLength: portion.length, portionLabel: portion.label,
      targetPortions, requiredArea, extraPortions: Math.max(0, result.capacity - guests)
    };
    if (!Object.values(resultValues).filter(value => typeof value === 'number').every(Number.isFinite)) {
      return { ok: false, errors: { form: 'Значения слишком велики для расчёта.' } };
    }
    return { ok: true, result: resultValues };
  }

  return Object.freeze({ defaults, presets, parseNumber, roundUpCentimeter, restoreSettings, calculate });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PortionCalc;