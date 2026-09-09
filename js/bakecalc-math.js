/* Pure BakeCalc calculations and state normalization, shared by browser and Node tests. */
const BakeCalcMath = (() => {
  'use strict';

  const FORM_TYPES = new Set(['circle', 'rect']);
  const INGREDIENT_UNITS = new Set(['г', 'мл', 'шт']);
  const PACKAGE_UNITS = new Set(['г', 'кг', 'мл', 'л', 'шт']);

  function number(value, fallback = 0) {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function text(value, fallback = '', max = 200) {
    return typeof value === 'string' ? value.slice(0, max) : fallback;
  }

  function normalizeForm(value, fallback) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      type: FORM_TYPES.has(source.type) ? source.type : fallback.type,
      diameter: number(source.diameter, fallback.diameter),
      length: number(source.length, fallback.length),
      width: number(source.width, fallback.width),
      height: number(source.height, fallback.height)
    };
  }

  function normalizeIngredient(value, index) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const unit = INGREDIENT_UNITS.has(source.unit) ? source.unit : 'г';
    const packageUnit = PACKAGE_UNITS.has(source.packageUnit) ? source.packageUnit : unit;
    return {
      id: Number.isSafeInteger(source.id) ? source.id : index + 1,
      name: text(source.name),
      amount: number(source.amount),
      unit,
      price: number(source.price),
      packageWeight: number(source.packageWeight),
      packageUnit
    };
  }

  function normalizeExtraCost(value, index) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      id: Number.isSafeInteger(source.id) ? source.id : index + 1,
      name: text(source.name),
      amount: number(source.amount)
    };
  }

  function restoreState(saved, defaults) {
    const source = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    const ingredients = Array.isArray(source.ingredients) ? source.ingredients.map(normalizeIngredient) : [];
    const extraCosts = Array.isArray(source.extraCosts)
      ? source.extraCosts.map(normalizeExtraCost)
      : defaults.extraCosts.map((item, index) => normalizeExtraCost(item, index));
    return {
      recipeName: text(source.recipeName),
      originalForm: normalizeForm(source.originalForm, defaults.originalForm),
      newForm: normalizeForm(source.newForm, defaults.newForm),
      useHeightOriginal: source.useHeightOriginal === true,
      useHeightNew: source.useHeightNew === true,
      ingredients,
      extraCosts,
      result: null
    };
  }

  function area(form) {
    if (!form || !FORM_TYPES.has(form.type)) return NaN;
    if (form.type === 'circle') {
      const diameter = number(form.diameter, NaN);
      if (!(diameter > 0)) return NaN;
      const radius = diameter / 2;
      return Math.PI * radius * radius;
    }
    const length = number(form.length, NaN);
    const width = number(form.width, NaN);
    return length > 0 && width > 0 ? length * width : NaN;
  }

  function coefficient({ originalForm, newForm, useHeightOriginal, useHeightNew }) {
    const oldArea = area(originalForm);
    const newArea = area(newForm);
    if (!Number.isFinite(oldArea) || !Number.isFinite(newArea)) {
      return { ok: false, error: 'Размеры обеих форм должны быть больше нуля.' };
    }
    if (useHeightOriginal !== useHeightNew) {
      return { ok: false, error: 'Чтобы учитывать высоту, включите её для обеих форм.' };
    }
    let value = newArea / oldArea;
    if (useHeightOriginal && useHeightNew) {
      const oldHeight = number(originalForm.height, NaN);
      const newHeight = number(newForm.height, NaN);
      if (!(oldHeight > 0) || !(newHeight > 0)) {
        return { ok: false, error: 'Высота обеих форм должна быть больше нуля.' };
      }
      value *= newHeight / oldHeight;
    }
    return Number.isFinite(value) && value > 0
      ? { ok: true, value }
      : { ok: false, error: 'Не удалось рассчитать коэффициент. Проверьте размеры форм.' };
  }

  function convertPackage(value, packageUnit, ingredientUnit) {
    if (!(value > 0)) return null;
    if (packageUnit === ingredientUnit) return value;
    if (packageUnit === 'кг' && ingredientUnit === 'г') return value * 1000;
    if (packageUnit === 'г' && ingredientUnit === 'г') return value;
    if (packageUnit === 'л' && ingredientUnit === 'мл') return value * 1000;
    if (packageUnit === 'мл' && ingredientUnit === 'мл') return value;
    return null;
  }

  function ingredientCostDetails(ingredients, coefficientValue) {
    const k = Number.isFinite(coefficientValue) && coefficientValue > 0 ? coefficientValue : 1;
    let total = 0;
    const issues = [];
    for (const ingredient of Array.isArray(ingredients) ? ingredients : []) {
      const amount = number(ingredient.amount) * k;
      if (!(amount > 0)) continue;
      const name = text(ingredient.name).trim() || 'Без названия';
      const price = number(ingredient.price);
      const packageWeight = number(ingredient.packageWeight);
      if (!(price > 0)) {
        issues.push(`${name}: не указана цена`);
        continue;
      }
      if (!(packageWeight > 0)) {
        issues.push(`${name}: не указан размер упаковки`);
        continue;
      }
      const converted = convertPackage(packageWeight, ingredient.packageUnit || ingredient.unit, ingredient.unit);
      if (!(converted > 0)) {
        issues.push(`${name}: единицы ингредиента и упаковки несовместимы`);
        continue;
      }
      total += price / converted * amount;
    }
    return { total, complete: issues.length === 0, issues };
  }

  return Object.freeze({ number, restoreState, area, coefficient, convertPackage, ingredientCostDetails });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = BakeCalcMath;
