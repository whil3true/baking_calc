/* Pure calculations, shared by the browser and Node's built-in test runner. */
const CreamCalc = (() => {
  'use strict';

  const defaults = Object.freeze({
    shape: 'circle', diameter: '20', length: '20', width: '20', height: '10',
    layers: '2', fillingThickness: '10', fillingDensity: '1',
    coverTop: true, coverSides: true,
    topThickness: '5', sideThickness: '5', coatingDensity: '1', reserve: '10'
  });

  // Keep unfinished input (including a decimal comma) when saving the form.
  // Only known primitive fields are restored; stored results are never trusted.
  function restoreSettings(saved) {
    const settings = { ...defaults };
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return settings;
    for (const key of Object.keys(defaults)) {
      const value = saved[key];
      if (key === 'shape') {
        if (value === 'circle' || value === 'rect') settings[key] = value;
      } else if (typeof defaults[key] === 'boolean') {
        if (typeof value === 'boolean') settings[key] = value;
      } else if (typeof value === 'string' && value.length <= 32) {
        settings[key] = value;
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        settings[key] = String(value);
      }
    }
    return settings;
  }

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    const text = value.trim().replace(',', '.');
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return NaN;
    const number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function calculate(input) {
    const errors = {};
    const values = {};
    if (!input || typeof input !== 'object') {
      return { ok: false, errors: { form: 'Введите параметры торта.' } };
    }
    function read(key, label, { allowZero = false, integer = false, max = Infinity } = {}) {
      const value = parseNumber(input[key]);
      if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0) ||
          (integer && !Number.isInteger(value)) || value > max) {
        errors[key] = `${label}: ${integer ? 'введите целое число' : 'введите число'} ${allowZero ? 'от 0' : 'больше 0'}${Number.isFinite(max) ? ` до ${max}` : ''}.`;
      }
      values[key] = value;
      return value;
    }

    if (input.shape !== 'circle' && input.shape !== 'rect') errors.shape = 'Выберите форму торта.';
    if (input.shape === 'circle') read('diameter', 'Диаметр');
    else if (input.shape === 'rect') {
      read('length', 'Длина');
      read('width', 'Ширина');
    }
    read('height', 'Высота торта');
    read('layers', 'Количество прослоек', { allowZero: true, integer: true, max: 100 });
    read('reserve', 'Запас в процентах', { allowZero: true, max: 100 });
    const hasFilling = values.layers > 0;
    const coverTop = input.coverTop === true;
    const coverSides = input.coverSides === true;
    if (hasFilling) {
      read('fillingThickness', 'Толщина прослойки');
      read('fillingDensity', 'Плотность крема для прослоек');
      if (values.layers * values.fillingThickness / 10 >= values.height) {
        errors.fillingThickness = 'Суммарная толщина прослоек должна быть меньше высоты торта: оставьте место для коржей.';
      }
    }
    if (coverTop) read('topThickness', 'Толщина покрытия верха');
    if (coverSides) read('sideThickness', 'Толщина покрытия боков');
    if (coverTop || coverSides) read('coatingDensity', 'Плотность крема для покрытия');
    if (values.layers === 0 && !coverTop && !coverSides) {
      errors.form = 'Добавьте хотя бы одну прослойку или включите покрытие верха / боков.';
    }
    if (Object.keys(errors).length) return { ok: false, errors };

    // Dimensions are cm; thickness inputs are mm. One cubic cm is one ml.
    const side = coverSides ? values.sideThickness / 10 : 0;
    const top = coverTop ? values.topThickness / 10 : 0;
    let area, sideArea;
    if (input.shape === 'circle') {
      const radius = values.diameter / 2;
      area = Math.PI * radius * radius;
      sideArea = Math.PI * side * (2 * radius + side);
    } else {
      area = values.length * values.width;
      sideArea = 2 * side * (values.length + values.width) + 4 * side * side;
    }
    // Side shell covers the assembled cake's full height. The top sits above
    // that shell and includes its rim, so the two volumes never overlap.
    const fillingVolume = hasFilling ? area * values.layers * values.fillingThickness / 10 : 0;
    const sidesVolume = coverSides ? sideArea * values.height : 0;
    const topVolume = coverTop ? (area + sideArea) * top : 0;
    const filling = hasFilling ? fillingVolume * values.fillingDensity : 0;
    const sides = coverSides ? sidesVolume * values.coatingDensity : 0;
    const topMass = coverTop ? topVolume * values.coatingDensity : 0;
    const subtotal = filling + sides + topMass;
    const reserve = subtotal * values.reserve / 100;
    const total = subtotal + reserve;
    // Avoid adding another 10 g due only to floating-point noise (100 × 1.1).
    const portions = total / 10;
    const prepare = Math.ceil(portions - Number.EPSILON * Math.max(1, portions)) * 10;
    const result = {
      fillingVolume, sidesVolume, topVolume, filling, sides, top: topMass,
      subtotal, reserve, total, prepare
    };
    if (!Object.values(result).every(Number.isFinite) || subtotal <= 0) {
      return { ok: false, errors: { form: 'Значения слишком велики или малы для расчёта. Проверьте размеры, толщину и плотность.' } };
    }
    return { ok: true, result };
  }

  return Object.freeze({ defaults, restoreSettings, parseNumber, calculate });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CreamCalc;
