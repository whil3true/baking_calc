/* BakeCalc DOM rendering. No state mutation or business calculations live here. */
const BakeCalcView = (() => {
  'use strict';

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function byId(id) { return document.getElementById(id); }
  function icons() { window.lucide?.createIcons(); }

  function showToast(message) {
    const toast = byId('toast');
    const text = byId('toastText');
    if (!toast || !text) return;
    text.textContent = message;
    toast.classList.remove('translate-y-[-200%]', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
      toast.classList.add('translate-y-[-200%]', 'opacity-0');
      toast.classList.remove('translate-y-0', 'opacity-100');
    }, 2500);
  }

  function renderFormTabs(formKey, state) {
    const form = state[formKey];
    const target = byId(`${formKey}Tabs`);
    if (!target || !form) return;
    target.innerHTML = `
      <button type="button" data-action="form-type" data-form-key="${formKey}" data-form-type="circle" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${form.type === 'circle' ? 'tab-active shadow-sm' : 'tab-inactive'}"><span class="inline-flex items-center gap-1.5"><i data-lucide="circle" class="w-4 h-4"></i>Круглая</span></button>
      <button type="button" data-action="form-type" data-form-key="${formKey}" data-form-type="rect" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${form.type === 'rect' ? 'tab-active shadow-sm' : 'tab-inactive'}"><span class="inline-flex items-center gap-1.5"><i data-lucide="square" class="w-4 h-4"></i>Прямоугольная</span></button>`;
  }

  function formNumberInput(formKey, field, label, value, extraClass = '') {
    return `<label class="block ${extraClass}"><span class="text-xs text-dark/60 mb-1 block">${label}</span><input type="number" step="any" min="0" inputmode="decimal" value="${value}" data-action="form-field" data-form-key="${formKey}" data-field="${field}" class="input-field w-full"></label>`;
  }

  function renderFormFields(formKey, state) {
    const form = state[formKey];
    const target = byId(`${formKey}Fields`);
    if (!target || !form) return;
    let html = form.type === 'circle'
      ? formNumberInput(formKey, 'diameter', 'Диаметр, см', form.diameter)
      : `<div class="grid grid-cols-2 gap-3">${formNumberInput(formKey, 'length', 'Длина, см', form.length)}${formNumberInput(formKey, 'width', 'Ширина, см', form.width)}</div>`;
    const useHeight = formKey === 'originalForm' ? state.useHeightOriginal : state.useHeightNew;
    if (useHeight) html += formNumberInput(formKey, 'height', 'Высота бортиков, см', form.height, 'mt-3');
    target.innerHTML = html;
  }

  function createIngredientRow(ingredient) {
    const row = document.createElement('tr');
    row.className = 'border-b border-soft/60 fade-in';
    row.dataset.id = ingredient.id;
    row.innerHTML = `<td class="py-2 pr-2"><input type="text" value="${escapeHtml(ingredient.name)}" placeholder="Название" data-action="ingredient-input" data-field="name" class="input-field w-full !h-11 !text-sm min-w-0"></td><td class="py-2 px-2"><input type="number" step="any" min="0" inputmode="decimal" value="${ingredient.amount}" placeholder="0" data-action="ingredient-input" data-field="amount" class="input-field w-20 !h-11 !text-sm min-w-0"></td><td class="py-2 px-2"><select data-action="ingredient-input" data-field="unit" class="input-field !h-11 !text-sm !px-2 w-16 min-w-0"><option value="г" ${ingredient.unit === 'г' ? 'selected' : ''}>г</option><option value="мл" ${ingredient.unit === 'мл' ? 'selected' : ''}>мл</option><option value="шт" ${ingredient.unit === 'шт' ? 'selected' : ''}>шт</option></select></td><td class="py-2 pl-1"><button type="button" data-action="delete-ingredient" class="text-dark/30 hover:text-red-500 transition-colors p-1" title="Удалить"><i data-lucide="x" class="w-4 h-4"></i></button></td>`;
    return row;
  }

  function createPriceRow(ingredient) {
    const row = document.createElement('tr');
    row.className = 'border-b border-soft/60';
    row.dataset.id = ingredient.id;
    const packageUnit = ingredient.packageUnit || ingredient.unit || 'г';
    row.innerHTML = `<td class="py-2 pr-2 text-sm" data-name-cell>${escapeHtml(ingredient.name) || '—'}</td><td class="py-2 px-2"><input type="number" step="any" min="0" inputmode="decimal" value="${ingredient.price}" placeholder="0.00" data-action="ingredient-input" data-field="price" class="input-field !h-10 !text-sm w-20 min-w-0"></td><td class="py-2 px-2"><input type="number" step="any" min="0" inputmode="decimal" value="${ingredient.packageWeight}" placeholder="0" data-action="ingredient-input" data-field="packageWeight" class="input-field !h-10 !text-sm w-16 min-w-0"></td><td class="py-2 pl-2"><select data-action="ingredient-input" data-field="packageUnit" class="input-field !h-10 !text-sm !px-2 w-14 min-w-0"><option value="г" ${packageUnit === 'г' ? 'selected' : ''}>г</option><option value="кг" ${packageUnit === 'кг' ? 'selected' : ''}>кг</option><option value="мл" ${packageUnit === 'мл' ? 'selected' : ''}>мл</option><option value="л" ${packageUnit === 'л' ? 'selected' : ''}>л</option><option value="шт" ${packageUnit === 'шт' ? 'selected' : ''}>шт</option></select></td>`;
    return row;
  }

  function renderAllIngredients(state) {
    const ingredientsBody = byId('ingredientsBody');
    const pricesBody = byId('pricesBody');
    if (!ingredientsBody || !pricesBody) return;
    ingredientsBody.replaceChildren();
    pricesBody.replaceChildren();
    const empty = state.ingredients.length === 0;
    byId('ingredientsPlaceholder').style.display = empty ? 'block' : 'none';
    byId('pricesPlaceholder').style.display = empty ? 'block' : 'none';
    state.ingredients.forEach(ingredient => {
      ingredientsBody.appendChild(createIngredientRow(ingredient));
      pricesBody.appendChild(createPriceRow(ingredient));
    });
    icons();
  }

  function createExtraCostRow(cost) {
    const row = document.createElement('div');
    row.className = 'flex flex-wrap sm:flex-nowrap items-center gap-2 extra-cost-row';
    row.dataset.id = cost.id;
    row.innerHTML = `<input type="text" value="${escapeHtml(cost.name)}" placeholder="Название расхода" data-action="extra-cost-input" data-field="name" class="input-field flex-1 min-w-0 !h-11 !text-sm order-1 sm:order-none"><input type="number" step="any" min="0" inputmode="decimal" value="${cost.amount}" placeholder="0.00" data-action="extra-cost-input" data-field="amount" class="input-field w-24 sm:w-28 shrink-0 min-w-0 !h-11 !text-sm order-2 sm:order-none"><button type="button" data-action="delete-extra-cost" class="w-8 h-8 shrink-0 flex items-center justify-center text-dark/30 hover:text-red-500 transition-colors order-3 sm:order-none" title="Удалить"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
    return row;
  }

  function renderAllExtraCosts(state, total) {
    const container = byId('extraCostsContainer');
    if (!container) return;
    container.replaceChildren(...state.extraCosts.map(createExtraCostRow));
    updateExtraCostsTotal(total);
    icons();
  }

  function updateExtraCostsTotal(total) {
    const node = byId('extraCostsTotal');
    if (node) node.textContent = `${total.toFixed(2)} ₽`;
  }

  function updatePriceName(id, value) {
    const cell = document.querySelector(`#pricesBody tr[data-id="${id}"] [data-name-cell]`);
    if (cell) cell.textContent = value || '—';
  }

  function togglePricesAccordion() {
    const content = byId('pricesAccordionContent');
    const icon = byId('pricesAccordionIcon');
    if (!content || !icon) return;
    content.classList.toggle('hidden');
    icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
  }

  function renderResults({ state, totalWeight, ingredientsCost, extraCostsTotal }) {
    const section = byId('resultsSection');
    if (!section) return;
    if (!state.result) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    const round = byId('roundResultsCheckbox');
    if (round) round.checked = state.result.roundResults;
    const k = state.result.coefficient;
    const pct = ((k - 1) * 100).toFixed(0);
    const badge = byId('resultCoefficientBadge');
    if (badge) badge.innerHTML = `<i data-lucide="calculator" class="w-4 h-4"></i><span>Коэффициент: ×${k.toFixed(2)} (порция ${pct >= 0 ? 'увеличена' : 'уменьшена'} на ${Math.abs(pct)}%)</span>`;
    const body = byId('resultsBody');
    if (body) body.innerHTML = state.ingredients.map(ingredient => {
      const amount = Number(ingredient.amount || 0) * k;
      const display = state.result.roundResults ? Math.round(amount) : amount.toFixed(1);
      return `<tr class="border-b border-soft/60"><td class="text-base">${escapeHtml(ingredient.name) || 'Без названия'}</td><td class="text-right text-xl font-bold text-caramel">${display} <span class="text-sm font-normal text-dark/50">${escapeHtml(ingredient.unit)}</span></td></tr>`;
    }).join('');
    byId('resultItemsCount').textContent = state.ingredients.length;
    byId('resultTotalWeight').textContent = `${totalWeight} г`;
    const hasCosts = ingredientsCost > 0 || extraCostsTotal > 0 || state.ingredients.some(item => Number(item.price) > 0);
    const costSection = byId('resultCostSection');
    if (hasCosts) {
      costSection.classList.remove('hidden');
      byId('resultIngredientsCost').textContent = `${ingredientsCost.toFixed(2)} ₽`;
      byId('resultExtraCostsTotal').textContent = `${extraCostsTotal.toFixed(2)} ₽`;
      byId('resultTotalCost').textContent = `${(ingredientsCost + extraCostsTotal).toFixed(2)} ₽`;
    } else {
      costSection.classList.add('hidden');
    }
    icons();
  }

  function syncStaticFields(state) {
    const recipe = byId('recipeNameInput');
    const originalHeight = byId('useHeightOriginal');
    const newHeight = byId('useHeightNew');
    if (recipe) recipe.value = state.recipeName;
    if (originalHeight) originalHeight.checked = state.useHeightOriginal;
    if (newHeight) newHeight.checked = state.useHeightNew;
  }

  function focusLastIngredient() {
    setTimeout(() => {
      const rows = document.querySelectorAll('#ingredientsBody tr');
      rows[rows.length - 1]?.querySelector('input[type="text"]')?.focus();
    }, 50);
  }

  function focusLastExtraCost() {
    setTimeout(() => {
      const rows = document.querySelectorAll('#extraCostsContainer .extra-cost-row');
      rows[rows.length - 1]?.querySelector('input[type="text"]')?.focus();
    }, 50);
  }

  return Object.freeze({
    showToast, renderFormTabs, renderFormFields, createIngredientRow, createPriceRow,
    renderAllIngredients, createExtraCostRow, renderAllExtraCosts, updateExtraCostsTotal,
    updatePriceName, togglePricesAccordion, renderResults, syncStaticFields,
    focusLastIngredient, focusLastExtraCost
  });
})();
