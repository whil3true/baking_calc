/* Pure PriceCalc calculations, shared by browser and Node tests. */
const PriceCalc = (() => {
  'use strict';

  const defaults = Object.freeze({
    ingredientsCost: '1000',
    packagingCost: '150',
    extraCost: '100',
    hours: '3',
    hourlyRate: '500',
    commissionPercent: '5',
    targetMode: 'margin',
    targetValue: '30',
    productWeightKg: '',
    portions: ''
  });

  function parseNumber(value, { allowEmpty = false } = {}) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    const text = value.trim().replace(',', '.');
    if (!text) return allowEmpty ? null : NaN;
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return NaN;
    const number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function restoreSettings(saved) {
    const settings = { ...defaults };
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return settings;
    for (const key of Object.keys(defaults)) {
      const value = saved[key];
      if (key === 'targetMode') {
        if (value === 'margin' || value === 'profit') settings[key] = value;
      } else if (typeof value === 'string' && value.length <= 32) {
        settings[key] = value;
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        settings[key] = String(value);
      }
    }
    return settings;
  }

  function validateMoney(input, key, label, errors, max = 1e8) {
    const value = parseNumber(input[key]);
    if (!Number.isFinite(value) || value < 0 || value > max) {
      errors[key] = `${label}: введите число от 0 до ${max.toLocaleString('ru-RU')}.`;
    }
    return value;
  }

  function calculate(input) {
    const errors = {};
    if (!input || typeof input !== 'object') return { ok: false, errors: { form: 'Введите параметры расчёта.' } };

    const ingredientsCost = validateMoney(input, 'ingredientsCost', 'Ингредиенты', errors);
    const packagingCost = validateMoney(input, 'packagingCost', 'Упаковка', errors);
    const extraCost = validateMoney(input, 'extraCost', 'Прочие расходы', errors);

    const hours = parseNumber(input.hours);
    if (!Number.isFinite(hours) || hours < 0 || hours > 1000) errors.hours = 'Время работы: введите число от 0 до 1000 часов.';

    const hourlyRate = validateMoney(input, 'hourlyRate', 'Стоимость часа', errors, 1e6);

    const commissionPercent = parseNumber(input.commissionPercent);
    if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent >= 100) {
      errors.commissionPercent = 'Комиссия: введите значение от 0 до 99,99%.';
    }

    if (input.targetMode !== 'margin' && input.targetMode !== 'profit') errors.targetMode = 'Выберите способ расчёта цены.';

    const targetValue = parseNumber(input.targetValue);
    if (!Number.isFinite(targetValue) || targetValue < 0 || targetValue > 1e8) errors.targetValue = 'Цель: введите неотрицательное число.';
    if (input.targetMode === 'margin' && Number.isFinite(targetValue) && targetValue >= 100) {
      errors.targetValue = 'Маржа должна быть меньше 100%.';
    }

    const productWeightKg = parseNumber(input.productWeightKg, { allowEmpty: true });
    if (productWeightKg !== null && (!Number.isFinite(productWeightKg) || productWeightKg <= 0 || productWeightKg > 10000)) {
      errors.productWeightKg = 'Масса изделия: оставьте поле пустым или укажите число больше 0.';
    }

    const portions = parseNumber(input.portions, { allowEmpty: true });
    if (portions !== null && (!Number.isFinite(portions) || portions <= 0 || !Number.isInteger(portions) || portions > 100000)) {
      errors.portions = 'Порции: оставьте поле пустым или укажите целое число больше 0.';
    }

    if (Object.keys(errors).length) return { ok: false, errors };

    const laborCost = hours * hourlyRate;
    const baseCost = ingredientsCost + packagingCost + extraCost + laborCost;
    const commissionRate = commissionPercent / 100;

    let salePrice;
    if (input.targetMode === 'margin') {
      const marginRate = targetValue / 100;
      const denominator = 1 - commissionRate - marginRate;
      if (denominator <= 0) {
        return { ok: false, errors: { targetValue: 'Сумма маржи и комиссии должна быть меньше 100%.' } };
      }
      salePrice = baseCost / denominator;
    } else {
      const denominator = 1 - commissionRate;
      if (denominator <= 0) {
        return { ok: false, errors: { commissionPercent: 'Комиссия должна быть меньше 100%.' } };
      }
      salePrice = (baseCost + targetValue) / denominator;
    }

    const commissionAmount = salePrice * commissionRate;
    const profit = salePrice - commissionAmount - baseCost;
    const marginPercent = salePrice > 0 ? (profit / salePrice) * 100 : 0;
    const markupPercent = baseCost > 0 ? (profit / baseCost) * 100 : 0;
    const pricePerKg = productWeightKg ? salePrice / productWeightKg : null;
    const pricePerPortion = portions ? salePrice / portions : null;

    const result = {
      ingredientsCost,
      packagingCost,
      extraCost,
      hours,
      hourlyRate,
      laborCost,
      baseCost,
      commissionPercent,
      commissionAmount,
      targetMode: input.targetMode,
      targetValue,
      salePrice,
      profit,
      marginPercent,
      markupPercent,
      productWeightKg,
      portions,
      pricePerKg,
      pricePerPortion
    };

    if (!Object.values(result).filter(value => typeof value === 'number').every(Number.isFinite)) {
      return { ok: false, errors: { form: 'Значения слишком велики для расчёта.' } };
    }
    return { ok: true, result };
  }

  return Object.freeze({ defaults, parseNumber, restoreSettings, calculate });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PriceCalc;
