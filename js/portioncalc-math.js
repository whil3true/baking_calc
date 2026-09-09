/* Pure PortionCalc calculations, shared by browser and Node tests. */
const PortionCalc = (() => {
  'use strict';

  const defaults = Object.freeze({
    shape: 'circle',
    portionLength: '10',
    portionWidth: '5',
    guests: '20',
    reserve: '10'
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
      } else if (typeof value === 'string' && value.length <= 32) {
        settings[key] = value;
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        settings[key] = String(value);
      }
    }
    return settings;
  }

  function compactRectangle(requiredArea) {
    if (!Number.isFinite(requiredArea) || requiredArea <= 0) return null;
    const limit = Math.ceil(Math.sqrt(requiredArea));
    let best = null;
    for (let width = 1; width <= limit; width += 1) {
      const length = Math.ceil(requiredArea / width);
      if (length < width) continue;
      const area = width * length;
      const difference = length - width;
      if (!best || area < best.area || (area === best.area && difference < best.difference)) {
        best = { width, length, area, difference };
      }
    }
    return best;
  }

  function calculate(input) {
    const errors = {};
    if (!input || typeof input !== 'object') return { ok: false, errors: { form: 'Введите параметры расчёта.' } };

    if (input.shape !== 'circle' && input.shape !== 'rect') errors.shape = 'Выберите форму торта.';

    const portionLength = parseNumber(input.portionLength);
    const portionWidth = parseNumber(input.portionWidth);
    if (!Number.isFinite(portionLength) || portionLength <= 0 || portionLength > 30) {
      errors.portionLength = input.shape === 'circle'
        ? 'Длина клина: введите число больше 0 и до 30 см.'
        : 'Длина кусочка: введите число больше 0 и до 30 см.';
    }
    if (!Number.isFinite(portionWidth) || portionWidth <= 0 || portionWidth > 30) {
      errors.portionWidth = input.shape === 'circle'
        ? 'Ширина клина: введите число больше 0 и до 30 см.'
        : 'Ширина кусочка: введите число больше 0 и до 30 см.';
    }

    const guests = parseNumber(input.guests);
    if (!Number.isFinite(guests) || guests <= 0 || !Number.isInteger(guests) || guests > 1000) {
      errors.guests = 'Количество гостей: введите целое число от 1 до 1000.';
    }

    const reserve = parseNumber(input.reserve);
    if (!Number.isFinite(reserve) || reserve < 0 || reserve > 100) {
      errors.reserve = 'Запас: введите значение от 0 до 100%.';
    }

    if (Object.keys(errors).length) return { ok: false, errors };

    const cutType = input.shape === 'circle' ? 'wedge' : 'grid';
    const portionArea = cutType === 'wedge'
      ? portionLength * portionWidth / 2
      : portionLength * portionWidth;
    const targetPortions = Math.ceil(guests * (1 + reserve / 100));
    const requiredArea = portionArea * targetPortions;
    let result;

    if (input.shape === 'circle') {
      const rawDiameter = 2 * Math.sqrt(requiredArea / Math.PI);
      const diameter = roundUpCentimeter(rawDiameter);
      const actualArea = Math.PI * Math.pow(diameter / 2, 2);
      const capacity = Math.floor(actualArea / portionArea + 1e-9);
      result = { shape: 'circle', cutType, rawDiameter, diameter, actualArea, capacity };
    } else {
      const rectangle = compactRectangle(requiredArea);
      if (!rectangle) return { ok: false, errors: { form: 'Не удалось подобрать размер торта.' } };
      const capacity = Math.floor(rectangle.area / portionArea + 1e-9);
      result = {
        shape: 'rect', cutType,
        width: rectangle.width,
        length: rectangle.length,
        actualArea: rectangle.area,
        capacity
      };
    }

    const resultValues = {
      ...result,
      guests,
      reserve,
      portionArea,
      portionWidth,
      portionLength,
      targetPortions,
      requiredArea,
      extraPortions: Math.max(0, result.capacity - guests)
    };

    if (!Object.values(resultValues).filter(value => typeof value === 'number').every(Number.isFinite)) {
      return { ok: false, errors: { form: 'Значения слишком велики для расчёта.' } };
    }
    return { ok: true, result: resultValues };
  }

  return Object.freeze({ defaults, parseNumber, roundUpCentimeter, compactRectangle, restoreSettings, calculate });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PortionCalc;
