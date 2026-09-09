const test = require('node:test');
const assert = require('node:assert/strict');
const BakeCalcState = require('../js/bakecalc-state.js');
const BakeCalcMath = require('../js/bakecalc-math.js');

const defaults = {
  recipeName: '',
  originalForm: { type: 'circle', diameter: 20, length: 20, width: 20, height: 5 },
  newForm: { type: 'circle', diameter: 24, length: 24, width: 24, height: 5 },
  useHeightOriginal: false,
  useHeightNew: false,
  ingredients: [],
  extraCosts: [{ id: 1, name: 'Упаковка / Коробка', amount: 0 }],
  result: null
};

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    value(key) { return values.get(key); }
  };
}

test('create returns an isolated deep copy of defaults', () => {
  const state = BakeCalcState.create(defaults);
  state.originalForm.diameter = 99;
  state.extraCosts[0].amount = 50;
  assert.equal(defaults.originalForm.diameter, 20);
  assert.equal(defaults.extraCosts[0].amount, 0);
});

test('save serializes current state under the BakeCalc storage key', () => {
  const storage = memoryStorage();
  const state = BakeCalcState.create(defaults);
  state.recipeName = 'Медовик';
  assert.equal(BakeCalcState.save(storage, state), true);
  assert.equal(JSON.parse(storage.value(BakeCalcState.STORAGE_KEY)).recipeName, 'Медовик');
});

test('load delegates validation to BakeCalcMath and discards stale results', () => {
  const storage = memoryStorage({
    [BakeCalcState.STORAGE_KEY]: JSON.stringify({
      recipeName: 'Тест',
      originalForm: { type: 'circle', diameter: 18 },
      newForm: { type: 'circle', diameter: 24 },
      ingredients: [{ id: 7, name: 'Мука', amount: 100, unit: 'г', price: 50, packageWeight: 1000, packageUnit: 'г' }],
      extraCosts: [],
      result: { coefficient: 999 }
    })
  });
  const state = BakeCalcState.load(storage, defaults, BakeCalcMath.restoreState);
  assert.equal(state.recipeName, 'Тест');
  assert.equal(state.originalForm.diameter, 18);
  assert.equal(state.ingredients[0].name, 'Мука');
  assert.equal(state.result, null);
});

test('load falls back to fresh defaults when persisted JSON is corrupt', () => {
  const storage = memoryStorage({ [BakeCalcState.STORAGE_KEY]: '{broken' });
  const state = BakeCalcState.load(storage, defaults, BakeCalcMath.restoreState);
  assert.deepEqual(state, defaults);
  assert.notEqual(state, defaults);
  assert.notEqual(state.extraCosts, defaults.extraCosts);
});

test('storage failures do not throw into the calculator UI', () => {
  const brokenStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); }
  };
  assert.doesNotThrow(() => BakeCalcState.save(brokenStorage, defaults));
  assert.equal(BakeCalcState.save(brokenStorage, defaults), false);
  assert.deepEqual(BakeCalcState.load(brokenStorage, defaults, BakeCalcMath.restoreState), defaults);
});
