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

  function splitExtraCostsForPriceCalc() {
    let packagingCost = 0;
    let extraCost = 0;
    for (const item of state.extraCosts || []) {
      const amount = Number(item?.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const name = typeof item?.name === 'string' ? item.name.toLowerCase() : '';
      if (/(упаков|короб)/i.test(name)) packagingCost += amount;
      else extraCost += amount;
    }
    return { packagingCost, extraCost };
  }

  function ensurePriceCalcLink() {
    let link = document.getElementById('openPriceCalc');
    if (link) return link;
    const costSection = document.getElementById('resultCostSection');
    if (!costSection) return null;
    link = document.createElement('a');
    link.id = 'openPriceCalc';
    link.className = 'btn-ghost w-full mt-3 py-3 rounded-xl font-semibold flex items-center justify-center gap-2';
    link.textContent = 'Рассчитать цену продажи';
    link.hidden = true;
    costSection.insertAdjacentElement('afterend', link);
    return link;
  }

  function updatePriceCalcLink(details) {
    const link = ensurePriceCalcLink();
    if (!link || !state.result) return;
    const anyPricing = state.ingredients.some(ing => Number(ing.price) > 0) || calculateExtraCostsTotal() > 0;
    const available = anyPricing && details.complete;
    link.hidden = !available;
    if (!available) {
      link.removeAttribute('href');
      return;
    }

    const extras = splitExtraCostsForPriceCalc();
    const params = new URLSearchParams({
      source: 'bakecalc',
      ingredientsCost: details.total.toFixed(2),
      packagingCost: extras.packagingCost.toFixed(2),
      extraCost: extras.extraCost.toFixed(2)
    });
    if (typeof state.recipeName === 'string' && state.recipeName.trim()) params.set('recipe', state.recipeName.trim());
    link.href = `pricecalc.html?${params.toString()}`;
  }

  const originalRenderResults = renderResults;
  renderResults = function () {
    originalRenderResults();
    const warning = document.getElementById('resultCostWarning');
    const details = state.result ? costDetails() : { complete: false, issues: [] };
    if (warning && state.result) {
      const anyPricing = state.ingredients.some(ing => Number(ing.price) > 0) || calculateExtraCostsTotal() > 0;
      warning.hidden = !anyPricing || details.complete;
      warning.textContent = details.complete ? '' : `Себестоимость неполная: ${details.issues.join('; ')}.`;
    }
    updatePriceCalcLink(details);
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
    const costSection = document.getElementById('resultCostSection');
    const costBox = costSection?.querySelector('[class~="bg-soft/40"]');
    if (costBox && !document.getElementById('resultCostWarning')) {
      const warning = document.createElement('p');
      warning.id = 'resultCostWarning';
      warning.className = 'mt-3 text-xs leading-relaxed';
      warning.style.color = '#912018';
      warning.hidden = true;
      costBox.appendChild(warning);
    }
    ensurePriceCalcLink();
    window.lucide?.createIcons();
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', finishSetup, { once: true });
  else finishSetup();
})();
