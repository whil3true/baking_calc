const test = require('node:test');
const assert = require('node:assert/strict');
const BakeCalc = require('../js/bakecalc-math.js');

const defaults = {
  recipeName: '',
  originalForm: { type: 'circle', diameter: 20, length: 20, width: 20, height: 5 },
  newForm: { type: 'circle', diameter: 24, length: 24, width: 24, height: 5 },
  useHeightOriginal: false,
  useHeightNew: false,
  ingredients: [],
  extraCosts: [{ id: 1, name: 'Упаковка', amount: 0 }],
  result: null
};

test('area coefficient works for round forms', () => {
  const calculation = BakeCalc.coefficient(defaults);
  assert.equal(calculation.ok, true);
  assert.ok(Math.abs(calculation.value - 1.44) < 1e-12);
});

test('height must be enabled for both forms', () => {
  const calculation = BakeCalc.coefficient({ ...defaults, useHeightOriginal: true });
  assert.equal(calculation.ok, false);
  assert.match(calculation.error, /обеих форм/i);
});

test('volume coefficient uses both heights', () => {
  const calculation = BakeCalc.coefficient({
    ...defaults,
    useHeightOriginal: true,
    useHeightNew: true,
    originalForm: { ...defaults.originalForm, height: 5 },
    newForm: { ...defaults.newForm, height: 10 }
  });
  assert.equal(calculation.ok, true);
  assert.ok(Math.abs(calculation.value - 2.88) < 1e-12);
});

test('grams and kilograms price correctly', () => {
  const details = BakeCalc.ingredientCostDetails([
    { name: 'Мука', amount: 150, unit: 'г', price: 80, packageWeight: 1, packageUnit: 'кг' }
  ], 1);
  assert.equal(details.complete, true);
  assert.equal(details.total, 12);
});

test('millilitres and litres price correctly', () => {
  const details = BakeCalc.ingredientCostDetails([
    { name: 'Молоко', amount: 50, unit: 'мл', price: 85, packageWeight: 1, packageUnit: 'л' }
  ], 1);
  assert.equal(details.complete, true);
  assert.equal(details.total, 4.25);
});

test('incompatible package units are reported instead of becoming silent zero cost', () => {
  const details = BakeCalc.ingredientCostDetails([
    { name: 'Мука', amount: 150, unit: 'г', price: 80, packageWeight: 1, packageUnit: 'л' }
  ], 1);
  assert.equal(details.total, 0);
  assert.equal(details.complete, false);
  assert.match(details.issues[0], /несовместимы/i);
});

test('missing price and package size are reported', () => {
  const details = BakeCalc.ingredientCostDetails([
    { name: 'Сахар', amount: 100, unit: 'г', price: 0, packageWeight: 1000, packageUnit: 'г' },
    { name: 'Масло', amount: 50, unit: 'г', price: 200, packageWeight: 0, packageUnit: 'г' }
  ], 1);
  assert.equal(details.complete, false);
  assert.equal(details.issues.length, 2);
});

test('stored state is normalized and stored result is discarded', () => {
  const restored = BakeCalc.restoreState({
    recipeName: 42,
    originalForm: { type: 'triangle', diameter: Infinity },
    ingredients: [{ id: 'bad', name: {}, amount: Infinity, unit: 'hack', price: -10, packageWeight: '1000', packageUnit: 'hack' }],
    extraCosts: [{ id: 7, name: 'Декор', amount: '50' }],
    result: { coefficient: 'broken' }
  }, defaults);
  assert.equal(restored.recipeName, '');
  assert.equal(restored.originalForm.type, defaults.originalForm.type);
  assert.equal(restored.originalForm.diameter, defaults.originalForm.diameter);
  assert.equal(restored.ingredients[0].amount, 0);
  assert.equal(restored.ingredients[0].unit, 'г');
  assert.equal(restored.ingredients[0].packageWeight, 1000);
  assert.equal(restored.extraCosts[0].amount, 50);
  assert.equal(restored.result, null);
});
