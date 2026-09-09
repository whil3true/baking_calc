/* Pure ConverterCalc calculations, shared by browser and Node tests. */
const ConverterCalc = (() => {
  'use strict';

  const defaults = Object.freeze({
    amount: '100',
    fromUnit: 'g',
    toUnit: 'ml',
    density: '1'
  });

  const units = Object.freeze({
    g: Object.freeze({ dimension: 'mass', factor: 1, label: 'г' }),
    kg: Object.freeze({ dimension: 'mass', factor: 1000, label: 'кг' }),
    ml: Object.freeze({ dimension: 'volume', factor: 1, label: 'мл' }),
    l: Object.freeze({ dimension: 'volume', factor: 1000, label: 'л' })
  });

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    const text = value.trim().replace(',', '.');
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return NaN;
    const number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function requiresDensity(fromUnit, toUnit) {
    const from = units[fromUnit];
    const to = units[toUnit];
    return Boolean(from && to && from.dimension !== to.dimension);
  }

  function restoreSettings(saved) {
    const settings = { ...defaults };
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return settings;

    for (const key of Object.keys(defaults)) {
      const value = saved[key];
      if (key === 'fromUnit' || key === 'toUnit') {
        if (typeof value === 'string' && units[value]) settings[key] = value;
      } else if (typeof value === 'string' && value.length <= 32) {
        settings[key] = value;
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        settings[key] = String(value);
      }
    }
    return settings;
  }

  function calculate(input) {
    if (!input || typeof input !== 'object') {
      return { ok: false, errors: { form: 'Введите параметры конвертации.' } };
    }

    const errors = {};
    const amount = parseNumber(input.amount);
    const from = units[input.fromUnit];
    const to = units[input.toUnit];

    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) {
      errors.amount = 'Количество: введите число больше 0 и не более 1 000 000 000.';
    }
    if (!from) errors.fromUnit = 'Выберите исходную единицу.';
    if (!to) errors.toUnit = 'Выберите итоговую единицу.';

    const densityNeeded = Boolean(from && to && from.dimension !== to.dimension);
    let density = null;
    if (densityNeeded) {
      density = parseNumber(input.density);
      if (!Number.isFinite(density) || density <= 0 || density > 100) {
        errors.density = 'Плотность: введите значение больше 0 и до 100 г/мл.';
      }
    }

    if (Object.keys(errors).length) return { ok: false, errors };

    let baseValue = amount * from.factor;
    let convertedBase;

    if (from.dimension === to.dimension) {
      convertedBase = baseValue;
    } else if (from.dimension === 'mass' && to.dimension === 'volume') {
      convertedBase = baseValue / density;
    } else {
      convertedBase = baseValue * density;
    }

    const converted = convertedBase / to.factor;
    if (!Number.isFinite(converted)) {
      return { ok: false, errors: { form: 'Значения слишком велики для расчёта.' } };
    }

    return {
      ok: true,
      result: {
        amount,
        fromUnit: input.fromUnit,
        toUnit: input.toUnit,
        fromLabel: from.label,
        toLabel: to.label,
        fromDimension: from.dimension,
        toDimension: to.dimension,
        densityNeeded,
        density,
        converted
      }
    };
  }

  return Object.freeze({ defaults, units, parseNumber, requiresDensity, restoreSettings, calculate });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ConverterCalc;
