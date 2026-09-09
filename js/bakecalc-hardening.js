/* BakeCalc reliability layer. Safe to load before or after DOMContentLoaded. */
(() => {
  'use strict';

  function invalidateResult(message = '') {
    if (state.result) {
      state.result = null;
      renderResults();
      if (message) showToast(message);
    }
  }

  const originalSetFormType = setFormType;
  setFormType = function (formKey, type) {
    originalSetFormType(formKey, type);
    invalidateResult('Размер формы изменён. Выполните расчёт заново.');
    saveState();
  };

  const originalUpdateForm = updateForm;
  updateForm = function (formKey, field, value) {
    originalUpdateForm(formKey, field, value);
    invalidateResult();
    saveState();
  };

  const originalToggleHeight = toggleHeight;
  toggleHeight = function (formKey) {
    originalToggleHeight(formKey);
    invalidateResult('Режим высоты изменён. Выполните расчёт заново.');
    saveState();
  };

  calculateArea = function (form) {
    return BakeCalcMath.area(form);
  };

  calculateCoefficient = function () {
    const result = BakeCalcMath.coefficient(state);
    return result.ok ? result.value : NaN;
  };

  function costDetails() {
    return BakeCalcMath.ingredientCostDetails(state.ingredients, state.result?.coefficient);
  }

  calculateIngredientsCost = function () {
    return costDetails().total;
  };

  const originalRenderResults = renderResults;
  renderResults = function () {
    originalRenderResults();
    const warning = document.getElementById('resultCostWarning');
    if (!warning || !state.result) return;
    const details = costDetails();
    const anyPricing = state.ingredients.some(ing => Number(ing.price) > 0) || calculateExtraCostsTotal() > 0;
    warning.hidden = !anyPricing || details.complete;
    warning.textContent = details.complete ? '' : `Себестоимость неполная: ${details.issues.join('; ')}.`;
  };

  calculateRecipe = function () {
    if (state.ingredients.length === 0) return showToast('Добавьте хотя бы один ингредиент');
    if (state.ingredients.every(ing => typeof ing.name !== 'string' || !ing.name.trim())) return showToast('Укажите названия ингредиентов');
    const calculation = BakeCalcMath.coefficient(state);
    if (!calculation.ok) return showToast(calculation.error);
    state.result = { coefficient: calculation.value, roundResults: false, calculatedAt: new Date().toISOString() };
    renderResults();
    saveState();
    setTimeout(() => document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  loadState = function () {
    try {
      const saved = localStorage.getItem('bakecalc_state');
      if (!saved) return;
      state = BakeCalcMath.restoreState(JSON.parse(saved), DEFAULT_STATE);
    } catch (error) {
      console.warn('Load error:', error);
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  };

  copyRecipe = async function () {
    const text = generateRecipeText();
    if (!text) return showToast('Сначала выполните расчёт');
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('copy command failed');
      }
      showToast('Скопировано в буфер!');
    } catch {
      showToast('Не удалось скопировать');
    }
  };

  function finishSetup() {
    const weightLabel = document.querySelector('#resultTotalWeight')?.previousElementSibling;
    if (weightLabel) weightLabel.textContent = 'Вес ингредиентов, указанных в граммах';
    const costBox = document.querySelector('#resultCostSection .bg-soft\/40');
    if (costBox && !document.getElementById('resultCostWarning')) {
      const warning = document.createElement('p');
      warning.id = 'resultCostWarning';
      warning.className = 'cost-warning';
      warning.hidden = true;
      costBox.appendChild(warning);
    }
    loadState();
    renderAll();
    window.lucide?.createIcons();
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', finishSetup, { once: true });
  else finishSetup();
})();
