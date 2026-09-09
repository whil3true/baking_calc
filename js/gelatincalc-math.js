/* Pure GelatinCalc calculations, shared by browser and Node tests. */
const GelatinCalc = (() => {
  'use strict';

  const defaults = Object.freeze({
    recipeWeight: '10',
    recipeBloom: '200',
    availableBloom: '180',
    waterRatio: '5'
  });

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    const text = value.trim().replace(',', '.');
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return NaN;
    const number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function restoreSettings(saved) {
    const settings = { ...defaults };
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return settings;
    for (const key of Object.keys(defaults)) {
      const value = saved[key];
      if (typeof value === 'string' && value.length <= 32) settings[key] = value;
      else if (typeof value === 'number' && Number.isFinite(value)) settings[key] = String(value);
    }
    return settings;
  }

  function calculate(input) {
    const errors = {};
    if (!input || typeof input !== 'object') {
      return { ok: false, errors: { form: 'Введите параметры желатина.' } };
    }

    const recipeWeight = parseNumber(input.recipeWeight);
    const recipeBloom = parseNumber(input.recipeBloom);
    const availableBloom = parseNumber(input.availableBloom);
    const waterRatio = parseNumber(input.waterRatio);

    if (!Number.isFinite(recipeWeight) || recipeWeight <= 0 || recipeWeight > 10000) {
      errors.recipeWeight = 'Количество желатина в рецепте: введите число больше 0 и до 10 000 г.';
    }
    if (!Number.isFinite(recipeBloom) || recipeBloom < 50 || recipeBloom > 350) {
      errors.recipeBloom = 'Bloom в рецепте: введите значение от 50 до 350.';
    }
    if (!Number.isFinite(availableBloom) || availableBloom < 50 || availableBloom > 350) {
      errors.availableBloom = 'Bloom вашего желатина: введите значение от 50 до 350.';
    }
    if (!Number.isFinite(waterRatio) || waterRatio < 0 || waterRatio > 20) {
      errors.waterRatio = 'Вода для гидратации: введите отношение от 0 до 20 частей воды на 1 часть желатина.';
    }
    if (Object.keys(errors).length) return { ok: false, errors };

    // Approximate Bloom conversion used in professional culinary practice:
    // newWeight = knownWeight * sqrt(knownBloom / targetBloom).
    const convertedWeight = recipeWeight * Math.sqrt(recipeBloom / availableBloom);
    const waterWeight = convertedWeight * waterRatio;
    const gelatinMass = convertedWeight + waterWeight;
    const strengthFactor = convertedWeight / recipeWeight;

    const result = {
      recipeWeight,
      recipeBloom,
      availableBloom,
      waterRatio,
      convertedWeight,
      waterWeight,
      gelatinMass,
      strengthFactor
    };

    if (!Object.values(result).every(Number.isFinite)) {
      return { ok: false, errors: { form: 'Значения слишком велики для расчёта.' } };
    }
    return { ok: true, result };
  }

  return Object.freeze({ defaults, parseNumber, restoreSettings, calculate });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GelatinCalc;
