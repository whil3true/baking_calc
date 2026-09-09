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
  if (isNaN(value) || value === null || value === undefined || value < 0) return defaultValue;
  return value;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[s]));
}

function showToast(message) {
  BakeCalcView.showToast(message);
}

function generateId() { return Date.now() + Math.floor(Math.random() * 1000); }

function convertPackageToIngredientUnit(value, packageUnit, ingredientUnit) {
  if (packageUnit === ingredientUnit) return value;
  if (packageUnit === 'кг' && ingredientUnit === 'г') return value * 1000;
  if (packageUnit === 'г' && ingredientUnit === 'кг') return value / 1000;
  if (packageUnit === 'л' && ingredientUnit === 'мл') return value * 1000;
  if (packageUnit === 'мл' && ingredientUnit === 'л') return value / 1000;
  return null;
}

function calculateArea(form) {
  if (form.type === 'circle') {
    const r = validateNumber(form.diameter, 1) / 2;
    return Math.PI * r * r;
  }
  return validateNumber(form.length, 1) * validateNumber(form.width, 1);
}

function calculateCoefficient() {
  const S_old = calculateArea(state.originalForm);
  const S_new = calculateArea(state.newForm);
  if (S_old <= 0 || isNaN(S_old)) return 1;
  if (state.useHeightOriginal || state.useHeightNew) {
    const h_old = state.useHeightOriginal ? validateNumber(state.originalForm.height, 1) : 1;
    const h_new = state.useHeightNew ? validateNumber(state.newForm.height, 1) : 1;
    if (h_old <= 0) return 1;
    return (S_new * h_new) / (S_old * h_old);
  }
  return S_new / S_old;
}

function calculateIngredientsCost() {
  if (!state.result) return 0;
  const k = state.result.coefficient;
  let total = 0;
  state.ingredients.forEach(ing => {
    const newAmount = validateNumber(ing.amount, 0) * k;
    const packageAmount = validateNumber(ing.packageWeight, 0);
    const packageUnit = ing.packageUnit || ing.unit || 'г';
    const ingredientUnit = ing.unit || 'г';
    const price = validateNumber(ing.price, 0);
    if (newAmount <= 0 || packageAmount <= 0 || price <= 0) return;
    const packageInIngredientUnits = convertPackageToIngredientUnit(packageAmount, packageUnit, ingredientUnit);
    if (packageInIngredientUnits === null || packageInIngredientUnits <= 0) return;
    total += (price / packageInIngredientUnits) * newAmount;
  });
  return total;
}

function calculateExtraCostsTotal() {
  return state.extraCosts.reduce((total, cost) => total + validateNumber(cost.amount, 0), 0);
}

function calculateTotalCost() { return calculateIngredientsCost() + calculateExtraCostsTotal(); }

function calculateTotalWeight() {
  if (!state.result) return 0;
  const k = state.result.coefficient;
  let totalGrams = 0;
  state.ingredients.forEach(ing => {
    if ((ing.unit || 'г') === 'г') totalGrams += validateNumber(ing.amount, 0) * k;
  });
  return state.result.roundResults ? Math.round(totalGrams) : Number(totalGrams.toFixed(1));
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

function createIngredientRow(ingredient) {
  return BakeCalcView.createIngredientRow(ingredient);
}

function createPriceRow(ingredient) {
  return BakeCalcView.createPriceRow(ingredient);
}

function addIngredient() {
  const ingredient = { id: generateId(), name: '', amount: 0, unit: 'г', price: 0, packageWeight: 1000, packageUnit: 'г' };
  state.ingredients.push(ingredient);
  renderAllIngredients();
  saveState();
  BakeCalcView.focusLastIngredient();
}

function deleteIngredient(id) {
  const index = state.ingredients.findIndex(item => item.id === id);
  if (index === -1) return;
  state.ingredients.splice(index, 1);
  renderAllIngredients();
  updateTotals();
}

function onIngredientInput(id, field, value) {
  const ingredient = state.ingredients.find(item => item.id === id);
  if (!ingredient) return;
  ingredient[field] = ['amount', 'price', 'packageWeight'].includes(field) ? validateNumber(value, 0) : value;
  if (field === 'name') BakeCalcView.updatePriceName(id, value);
  updateTotals();
}

function renderAllIngredients() {
  BakeCalcView.renderAllIngredients(state);
}

function createExtraCostRow(cost) {
  return BakeCalcView.createExtraCostRow(cost);
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
  updateTotals();
}

function onExtraCostInput(id, field, value) {
  const cost = state.extraCosts.find(item => item.id === id);
  if (!cost) return;
  cost[field] = field === 'amount' ? validateNumber(value, 0) : value;
  BakeCalcView.updateExtraCostsTotal(calculateExtraCostsTotal());
  if (state.result) renderResults();
  saveState();
}

function renderAllExtraCosts() {
  BakeCalcView.renderAllExtraCosts(state, calculateExtraCostsTotal());
}

function renderResults() {
  BakeCalcView.renderResults({
    state,
    totalWeight: calculateTotalWeight(),
    ingredientsCost: calculateIngredientsCost(),
    extraCostsTotal: calculateExtraCostsTotal()
  });
}

function onRecipeNameInput(value) { state.recipeName = value; saveState(); }
function setFormType(formKey, type) { state[formKey].type = type; renderFormTabs(formKey); renderFormFields(formKey); saveState(); lucide.createIcons(); }
function updateForm(formKey, field, value) { state[formKey][field] = validateNumber(value, state[formKey][field]); saveState(); }
function toggleHeight(formKey) {
  if (formKey === 'original') state.useHeightOriginal = document.getElementById('useHeightOriginal').checked;
  else state.useHeightNew = document.getElementById('useHeightNew').checked;
  renderFormFields(formKey === 'original' ? 'originalForm' : 'newForm');
  saveState(); lucide.createIcons();
}
function togglePricesAccordion() {
  BakeCalcView.togglePricesAccordion();
}

function toggleRoundResults() { if (!state.result) return; state.result.roundResults = document.getElementById('roundResultsCheckbox').checked; renderResults(); saveState(); }

function calculateRecipe() {
  if (state.ingredients.length === 0) return showToast('Добавьте хотя бы один ингредиент');
  if (state.ingredients.every(ing => !ing.name.trim())) return showToast('Укажите названия ингредиентов');
  const S_old = calculateArea(state.originalForm), S_new = calculateArea(state.newForm);
  if (S_old <= 0 || S_new <= 0) return showToast('Размеры форм должны быть больше нуля');
  state.result = { coefficient: calculateCoefficient(), roundResults: false, calculatedAt: new Date().toISOString() };
  renderResults(); saveState();
  setTimeout(() => document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}
function recalculate() { state.result = null; renderResults(); saveState(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function loadDemoRecipe() { state = BakeCalcState.clone(DEMO_RECIPE); saveState(); renderAll(); lucide.createIcons(); showToast('Демо-рецепт «Классический бисквит» загружен'); }
function clearAll() {
  if (state.ingredients.length === 0 && state.extraCosts.length === 0 && !state.recipeName) return;
  if (!confirm('Очистить все поля? Это действие нельзя отменить.')) return;
  state = BakeCalcState.create(DEFAULT_STATE); saveState(); renderAll(); lucide.createIcons(); showToast('Все поля очищены');
}
function formatForm(form) {
  let result = form.type === 'circle' ? `Круглая ⌀${form.diameter} см` : `Прямоугольная ${form.length}×${form.width} см`;
  const useHeight = form === state.originalForm ? state.useHeightOriginal : state.useHeightNew;
  if (useHeight) result += ` (высота ${form.height} см)`;
  return result;
}
function generateRecipeText() {
  if (!state.result) return '';
  const k = state.result.coefficient, pct = ((k - 1) * 100).toFixed(0), sign = pct >= 0 ? '+' : '';
  let text = '═══════════════════════════════\n';
  text += state.recipeName ? `   🎂 ${state.recipeName.toUpperCase()}\n` : '   🎂 ПЕРЕСЧИТАННЫЙ РЕЦЕПТ\n';
  text += '═══════════════════════════════\n\n';
  text += `📐 Исходная форма: ${formatForm(state.originalForm)}\n📐 Новая форма: ${formatForm(state.newForm)}\n🔢 Коэффициент: ×${k.toFixed(2)} (${sign}${pct}%)\n\n📝 ИНГРЕДИЕНТЫ:\n───────────────────────────────\n`;
  if (state.ingredients.length === 0) text += '(нет ингредиентов)\n';
  else state.ingredients.forEach(ing => { const amount = validateNumber(ing.amount, 0) * k; const display = state.result.roundResults ? Math.round(amount) : amount.toFixed(1); text += `• ${ing.name || 'Без названия'}: ${display} ${ing.unit}\n`; });
  text += `───────────────────────────────\n⚖️ Вес ингредиентов (г): ${calculateTotalWeight()} г\n`;
  const ingredientsCost = calculateIngredientsCost(), extraCostsTotal = calculateExtraCostsTotal(), totalCost = ingredientsCost + extraCostsTotal;
  if (totalCost > 0) text += `\n💰 СЕБЕСТОИМОСТЬ:\n• Ингредиенты: ${ingredientsCost.toFixed(2)} ₽\n${extraCostsTotal > 0 ? `• Доп. расходы: ${extraCostsTotal.toFixed(2)} ₽\n` : ''}• ИТОГО: ${totalCost.toFixed(2)} ₽\n`;
  return `${text}\n═══════════════════════════════\n✨ Рассчитано в BakeCalc\n`;
}
async function copyRecipe() {
  const text = generateRecipeText();
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    showToast('Скопировано в буфер!');
  } catch { showToast('Не удалось скопировать'); }
}

function saveState() { BakeCalcState.save(localStorage, state); }
function loadState() { state = BakeCalcState.load(localStorage, DEFAULT_STATE, BakeCalcMath.restoreState); }
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
    clearAll: () => clearAll(),
    addIngredient: () => addIngredient(),
    loadDemoRecipe: () => loadDemoRecipe(),
    togglePricesAccordion: () => togglePricesAccordion(),
    addExtraCost: () => addExtraCost(),
    calculateRecipe: () => calculateRecipe(),
    copyRecipe: () => copyRecipe(),
    recalculate: () => recalculate(),
    setFormType: (formKey, type) => setFormType(formKey, type),
    deleteIngredient: id => deleteIngredient(id),
    deleteExtraCost: id => deleteExtraCost(id),
    onRecipeNameInput: value => onRecipeNameInput(value),
    updateForm: (formKey, field, value) => updateForm(formKey, field, value),
    onIngredientInput: (id, field, value) => onIngredientInput(id, field, value),
    onExtraCostInput: (id, field, value) => onExtraCostInput(id, field, value),
    toggleHeight: formKey => toggleHeight(formKey),
    toggleRoundResults: () => toggleRoundResults()
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderAll();
  bindUiEvents();
  lucide.createIcons();
});
