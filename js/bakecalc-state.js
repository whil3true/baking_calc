/* BakeCalc state and persistence helpers. No DOM dependencies. */
const BakeCalcState = (() => {
  'use strict';

  const STORAGE_KEY = 'bakecalc_state';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function create(defaults) {
    return clone(defaults);
  }

  function save(storage, state, key = STORAGE_KEY) {
    try {
      storage.setItem(key, JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn('BakeCalc state save error:', error);
      return false;
    }
  }

  function load(storage, defaults, normalize, key = STORAGE_KEY) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return create(defaults);
      const parsed = JSON.parse(raw);
      return typeof normalize === 'function'
        ? normalize(parsed, defaults)
        : parsed;
    } catch (error) {
      console.warn('BakeCalc state load error:', error);
      return create(defaults);
    }
  }

  return Object.freeze({ STORAGE_KEY, clone, create, save, load });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = BakeCalcState;
