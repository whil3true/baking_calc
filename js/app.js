/* =========================================================
   BakeCalc — application logic
   ========================================================= */
const DEFAULT_STATE = {
  recipeName: '',
  originalForm: { type: 'circle', diameter: 20, length: 20, width: 20, height: 5 },
  newForm: { type: 'circle', diameter: 24, length: 24, width: 24, height: 5 },
  useHeightOriginal: false,
  useHeightNew: false,
  ingredients: [],
  extraCosts: [
    { id: 1, name: 'Упаковка / Коробка', amount: 0 },
    { id: 2, name: 'Декор', amount: 0 },
    { id: 3, name: 'Доставка', amount: 0 }
  ],
  result: null
};

const DEMO_RECIPE = {
  recipeName: 'Классический бисквит',
  originalForm: { type: 'circle', diameter: 20, length: 20, width: 20, height: 5 },
  newForm: { type: 'circle', diameter: 26, length: 26, width: 26, height: 5 },
  useHeightOriginal: false,
  useHeightNew: false,
  ingredients: [
    { id: 1, name: 'Мука пшеничная', amount: 150, unit: 'г', price: 80, packageWeight: 1000, packageUnit: 'г' },
    { id: 2, name: 'Сахар', amount: 150, unit: 'г', price: 75, packageWeight: 1000, packageUnit: 'г' },
    { id: 3, name: 'Яйца куриные', amount: 4, unit: 'шт', price: 120, packageWeight: 10, packageUnit: 'шт' },
    { id: 4, name: 'Масло сливочное', amount: 30, unit: 'г', price: 220, packageWeight: 200, packageUnit: 'г' },
    { id: 5, name: 'Молоко', amount: 50, unit: 'мл', price: 85, packageWeight: 1, packageUnit: 'л' },
    { id: 6, name: 'Разрыхлитель', amount: 5, unit: 'г', price: 45, packageWeight: 100, packageUnit: 'г' },
    { id: 7, name: 'Ванильный сахар', amount: 10, unit: 'г', price: 90, packageWeight: 100, packageUnit: 'г' },
    { id: 8, name: 'Соль', amount: 2, unit: 'г', price: 25, packageWeight: 500, packageUnit: 'г' }
  ],
  extraCosts: [
    { id: 1, name: 'Упаковка / Коробка', amount: 60 },
    { id: 2, name: 'Декор', amount: 150 },
    { id: 3, name: 'Доставка', amount: 0 }
  ],
  result: null
};

let state = BakeCalcState.create(DEFAULT_STATE);

function validateNumber(value, defaultValue = 0) {
  return BakeCalcMath.number(value, defaultValue);
}

function showToast(message) {
  BakeCalcView.showToast(message);
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function calculateIngredientsCostDetails() {
  return BakeCalcMath.ingredientCostDetails(state.ingredients, state.result?.coefficient);
}

function calculateIngredientsCost() {
  return calculateIngredientsCostDetails().total;
}

function calculateExtraCostsTotal() {
  return state.extraCosts.reduce((total, cost) => total + validateNumber(cost.amount, 0), 0);
}

function calculateTotalWeight() {
  if (!state.result) return 0;
  const coefficient = state.result.coefficient;
  let totalGrams = 0;
  for (const ingredient of state.ingredients) {
    if ((ingredient.unit || 'г') === 'г') totalGrams += validateNumber(ingredient.amount, 0) * coefficient;
  }
  return state.result.roundResults ? Math.round(totalGrams) : Number(totalGrams.toFixed(1));
}

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

function buildPriceCalcUrl(details) {
  const anyPricing = state.ingredients.some(ingredient => Number(ingredient.price) > 0) || calculateExtraCostsTotal() > 0;
  if (!state.result || !anyPricing || !details.complete) return '';
  const extras = splitExtraCostsForPriceCalc();
  const params = new URLSearchParams({
    source: 'bakecalc',
    ingredientsCost: details.total.toFixed(2),
    packagingCost: extras.packagingCost.toFixed(2),
    extraCost: extras.extraCost.toFixed(2)
  });
  if (typeof state.recipeName === 'string' && state.recipeName.trim()) params.set('recipe', state.recipeName.trim());
  return `/raschet-ceny-torta/?${params.toString()}`;
}

function invalidateResult(message = '') {
  if (!state.result) return;
  state.result = null;
  renderResults();
  if (message) showToast(message);
}

function saveState() {
  BakeCalcState.save(localStorage, state);
}

function loadState() {
  state = BakeCalcState.load(localStorage, DEFAULT_STATE, BakeCalcMath.restoreState);
}

function updateTotals() {
  const extraTotal = calculateExtraCostsTotal();
  BakeCalcView.updateExtraCostsTotal(extraTotal);
  if (state.result) renderResults();
  saveState();
}

function renderFormTabs(formKey) {
  BakeCalcView.renderFormTabs(formKey, state);
}

function renderFormFields(formKey) {
  BakeCalcView.renderFormFields(formKey, state);
}

function addIngredient() {
  state.ingredients.push({ id: generateId(), name: '', amount: 0, unit: 'г', price: 0, packageWeight: 1000, packageUnit: 'г' });
  renderAllIngredients();
  saveState();
  BakeCalcView.focusLastIngredient();
}

function deleteIngredient(id) {
  const index = state.ingredients.findIndex(item => item.id === id);
  if (index === -1) return;
  state.ingredients.splice(index, 1);
  renderAllIngredients();
  invalidateResult();
  updateTotals();
}

function onIngredientInput(id, field, value) {
  const ingredient = state.ingredients.find(item => item.id === id);
  if (!ingredient) return;
  ingredient[field] = ['amount', 'price', 'packageWeight'].includes(field) ? validateNumber(value, 0) : value;
  if (field === 'name') BakeCalcView.updatePriceName(id, value);
  invalidateResult();
  updateTotals();
}

function renderAllIngredients() {
  BakeCalcView.renderAllIngredients(state);
}

function addExtraCost() {
  state.extraCosts.push({ id: generateId(), name: '', amount: 0 });
  renderAllExtraCosts();
  saveState();
  BakeCalcView.focusLastExtraCost();
}

function deleteExtraCost(id) {
  const index = state.extraCosts.findIndex(item => item.id === id);
  if (index === -1) return;
  state.extraCosts.splice(index, 1);
  renderAllExtraCosts();
  invalidateResult();
  updateTotals();
}

function onExtraCostInput(id, field, value) {
  const cost = state.extraCosts.find(item => item.id === id);
  if (!cost) return;
  cost[field] = field === 'amount' ? validateNumber(value, 0) : value;
  invalidateResult();
  BakeCalcView.updateExtraCostsTotal(calculateExtraCostsTotal());
  saveState();
}

function renderAllExtraCosts() {
  BakeCalcView.renderAllExtraCosts(state, calculateExtraCostsTotal());
}

function renderResults() {
  const costDetails = state.result ? calculateIngredientsCostDetails() : { total: 0, complete: false, issues: [] };
  const extraCostsTotal = calculateExtraCostsTotal();
  BakeCalcView.renderResults({
    state,
    totalWeight: calculateTotalWeight(),
    ingredientsCost: costDetails.total,
    extraCostsTotal,
    costDetails,
    priceCalcHref: buildPriceCalcUrl(costDetails)
  });
}

function onRecipeNameInput(value) {
  state.recipeName = value;
  saveState();
}

function setFormType(formKey, type) {
  state[formKey].type = type;
  renderFormTabs(formKey);
  renderFormFields(formKey);
  invalidateResult('Размер формы изменён. Выполните расчёт заново.');
  saveState();
  window.lucide?.createIcons();
}

function updateForm(formKey, field, value) {
  state[formKey][field] = validateNumber(value, state[formKey][field]);
  invalidateResult();
  saveState();
}

function toggleHeight(formKey) {
  if (formKey === 'original') state.useHeightOriginal = document.getElementById('useHeightOriginal').checked;
  else state.useHeightNew = document.getElementById('useHeightNew').checked;
  renderFormFields(formKey === 'original' ? 'originalForm' : 'newForm');
  invalidateResult('Режим высоты изменён. Выполните расчёт заново.');
  saveState();
  window.lucide?.createIcons();
}

function togglePricesAccordion() {
  BakeCalcView.togglePricesAccordion();
}

function toggleRoundResults() {
  if (!state.result) return;
  state.result.roundResults = document.getElementById('roundResultsCheckbox').checked;
  renderResults();
  saveState();
}

function calculateRecipe() {
  if (state.ingredients.length === 0) return showToast('Добавьте хотя бы один ингредиент');
  if (state.ingredients.every(ingredient => typeof ingredient.name !== 'string' || !ingredient.name.trim())) return showToast('Укажите названия ингредиентов');
  const calculation = BakeCalcMath.coefficient(state);
  if (!calculation.ok) return showToast(calculation.error);
  state.result = { coefficient: calculation.value, roundResults: false, calculatedAt: new Date().toISOString() };
  renderResults();
  saveState();
  setTimeout(() => document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function recalculate() {
  state.result = null;
  renderResults();
  saveState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadDemoRecipe() {
  state = BakeCalcState.clone(DEMO_RECIPE);
  saveState();
  renderAll();
  window.lucide?.createIcons();
  showToast('Демо-рецепт «Классический бисквит» загружен');
}

function clearAll() {
  if (state.ingredients.length === 0 && state.extraCosts.length === 0 && !state.recipeName) return;
  if (!confirm('Очистить все поля? Это действие нельзя отменить.')) return;
  state = BakeCalcState.create(DEFAULT_STATE);
  saveState();
  renderAll();
  window.lucide?.createIcons();
  showToast('Все поля очищены');
}

function formatForm(form) {
  let result = form.type === 'circle' ? `Круглая ⌀${form.diameter} см` : `Прямоугольная ${form.length}×${form.width} см`;
  const useHeight = form === state.originalForm ? state.useHeightOriginal : state.useHeightNew;
  if (useHeight) result += ` (высота ${form.height} см)`;
  return result;
}

function generateRecipeText() {
  if (!state.result) return '';
  const k = state.result.coefficient;
  const pct = ((k - 1) * 100).toFixed(0);
  const sign = pct >= 0 ? '+' : '';
  let text = '═══════════════════════════════\n';
  text += state.recipeName ? `   🎂 ${state.recipeName.toUpperCase()}\n` : '   🎂 ПЕРЕСЧИТАННЫЙ РЕЦЕПТ\n';
  text += '═══════════════════════════════\n\n';
  text += `📐 Исходная форма: ${formatForm(state.originalForm)}\n📐 Новая форма: ${formatForm(state.newForm)}\n🔢 Коэффициент: ×${k.toFixed(2)} (${sign}${pct}%)\n\n📝 ИНГРЕДИЕНТЫ:\n───────────────────────────────\n`;
  for (const ingredient of state.ingredients) {
    const amount = validateNumber(ingredient.amount, 0) * k;
    const display = state.result.roundResults ? Math.round(amount) : amount.toFixed(1);
    text += `• ${ingredient.name || 'Без названия'}: ${display} ${ingredient.unit}\n`;
  }
  text += `───────────────────────────────\n⚖️ Вес ингредиентов (г): ${calculateTotalWeight()} г\n`;
  const ingredientsCost = calculateIngredientsCost();
  const extraCostsTotal = calculateExtraCostsTotal();
  const totalCost = ingredientsCost + extraCostsTotal;
  if (totalCost > 0) text += `\n💰 СЕБЕСТОИМОСТЬ:\n• Ингредиенты: ${ingredientsCost.toFixed(2)} ₽\n${extraCostsTotal > 0 ? `• Доп. расходы: ${extraCostsTotal.toFixed(2)} ₽\n` : ''}• ИТОГО: ${totalCost.toFixed(2)} ₽\n`;
  return `${text}\n═══════════════════════════════\n✨ Рассчитано в KonditerCalc\n`;
}

async function copyRecipe() {
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
}

function renderAll() {
  BakeCalcView.syncStaticFields(state);
  renderFormTabs('originalForm');
  renderFormTabs('newForm');
  renderFormFields('originalForm');
  renderFormFields('newForm');
  renderAllIngredients();
  renderAllExtraCosts();
  renderResults();
}

function bindUiEvents() {
  BakeCalcEvents.bind({
    clearAll, addIngredient, loadDemoRecipe, togglePricesAccordion, addExtraCost,
    calculateRecipe, copyRecipe, recalculate, setFormType, deleteIngredient,
    deleteExtraCost, onRecipeNameInput, updateForm, onIngredientInput,
    onExtraCostInput, toggleHeight, toggleRoundResults
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderAll();
  bindUiEvents();
  window.lucide?.createIcons();
});
