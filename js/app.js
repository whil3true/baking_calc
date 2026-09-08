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

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

function validateNumber(value, defaultValue = 0) {
  if (isNaN(value) || value === null || value === undefined || value < 0) return defaultValue;
  return value;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, s => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[s]));
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toastText');
  text.textContent = message;
  toast.classList.remove('translate-y-[-200%]', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.add('translate-y-[-200%]', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 2500);
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
  document.getElementById('extraCostsTotal').textContent = `${extraTotal.toFixed(2)} ₽`;
  if (state.result) renderResults();
  saveState();
}

function renderFormTabs(formKey) {
  const form = state[formKey];
  document.getElementById(`${formKey}Tabs`).innerHTML = `
    <button onclick="setFormType('${formKey}', 'circle')" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${form.type === 'circle' ? 'tab-active shadow-sm' : 'tab-inactive'}"><span class="inline-flex items-center gap-1.5"><i data-lucide="circle" class="w-4 h-4"></i>Круглая</span></button>
    <button onclick="setFormType('${formKey}', 'rect')" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${form.type === 'rect' ? 'tab-active shadow-sm' : 'tab-inactive'}"><span class="inline-flex items-center gap-1.5"><i data-lucide="square" class="w-4 h-4"></i>Прямоугольная</span></button>`;
}

function renderFormFields(formKey) {
  const form = state[formKey];
  const container = document.getElementById(`${formKey}Fields`);
  let html = '';
  if (form.type === 'circle') {
    html = `<label class="block"><span class="text-xs text-dark/60 mb-1 block">Диаметр, см</span><input type="number" step="any" min="0" inputmode="decimal" value="${form.diameter}" oninput="updateForm('${formKey}', 'diameter', parseFloat(this.value))" class="input-field w-full"></label>`;
  } else {
    html = `<div class="grid grid-cols-2 gap-3"><label class="block"><span class="text-xs text-dark/60 mb-1 block">Длина, см</span><input type="number" step="any" min="0" inputmode="decimal" value="${form.length}" oninput="updateForm('${formKey}', 'length', parseFloat(this.value))" class="input-field w-full"></label><label class="block"><span class="text-xs text-dark/60 mb-1 block">Ширина, см</span><input type="number" step="any" min="0" inputmode="decimal" value="${form.width}" oninput="updateForm('${formKey}', 'width', parseFloat(this.value))" class="input-field w-full"></label></div>`;
  }
  const useHeight = formKey === 'originalForm' ? state.useHeightOriginal : state.useHeightNew;
  if (useHeight) html += `<label class="block mt-3"><span class="text-xs text-dark/60 mb-1 block">Высота бортиков, см</span><input type="number" step="any" min="0" inputmode="decimal" value="${form.height}" oninput="updateForm('${formKey}', 'height', parseFloat(this.value))" class="input-field w-full"></label>`;
  container.innerHTML = html;
}

function createIngredientRow(ing) {
  const tr = document.createElement('tr');
  tr.className = 'border-b border-soft/60 fade-in';
  tr.dataset.id = ing.id;
  tr.innerHTML = `<td class="py-2 pr-2"><input type="text" value="${escapeHtml(ing.name)}" placeholder="Название" oninput="onIngredientInput(${ing.id}, 'name', this.value)" class="input-field w-full !h-11 !text-sm min-w-0"></td><td class="py-2 px-2"><input type="number" step="any" min="0" inputmode="decimal" value="${ing.amount}" placeholder="0" oninput="onIngredientInput(${ing.id}, 'amount', parseFloat(this.value) || 0)" class="input-field w-20 !h-11 !text-sm min-w-0"></td><td class="py-2 px-2"><select onchange="onIngredientInput(${ing.id}, 'unit', this.value)" class="input-field !h-11 !text-sm !px-2 w-16 min-w-0"><option value="г" ${ing.unit === 'г' ? 'selected' : ''}>г</option><option value="мл" ${ing.unit === 'мл' ? 'selected' : ''}>мл</option><option value="шт" ${ing.unit === 'шт' ? 'selected' : ''}>шт</option></select></td><td class="py-2 pl-1"><button onclick="deleteIngredient(${ing.id})" class="text-dark/30 hover:text-red-500 transition-colors p-1" title="Удалить"><i data-lucide="x" class="w-4 h-4"></i></button></td>`;
  return tr;
}

function createPriceRow(ing) {
  const tr = document.createElement('tr');
  tr.className = 'border-b border-soft/60';
  tr.dataset.id = ing.id;
  const pkgUnit = ing.packageUnit || ing.unit || 'г';
  tr.innerHTML = `<td class="py-2 pr-2 text-sm" data-name-cell>${escapeHtml(ing.name) || '—'}</td><td class="py-2 px-2"><input type="number" step="any" min="0" inputmode="decimal" value="${ing.price}" placeholder="0.00" oninput="onIngredientInput(${ing.id}, 'price', parseFloat(this.value) || 0)" class="input-field !h-10 !text-sm w-20 min-w-0"></td><td class="py-2 px-2"><input type="number" step="any" min="0" inputmode="decimal" value="${ing.packageWeight}" placeholder="0" oninput="onIngredientInput(${ing.id}, 'packageWeight', parseFloat(this.value) || 0)" class="input-field !h-10 !text-sm w-16 min-w-0"></td><td class="py-2 pl-2"><select onchange="onIngredientInput(${ing.id}, 'packageUnit', this.value)" class="input-field !h-10 !text-sm !px-2 w-14 min-w-0"><option value="г" ${pkgUnit === 'г' ? 'selected' : ''}>г</option><option value="кг" ${pkgUnit === 'кг' ? 'selected' : ''}>кг</option><option value="мл" ${pkgUnit === 'мл' ? 'selected' : ''}>мл</option><option value="л" ${pkgUnit === 'л' ? 'selected' : ''}>л</option><option value="шт" ${pkgUnit === 'шт' ? 'selected' : ''}>шт</option></select></td>`;
  return tr;
}

function addIngredient() {
  const ing = { id: generateId(), name: '', amount: 0, unit: 'г', price: 0, packageWeight: 1000, packageUnit: 'г' };
  state.ingredients.push(ing);
  document.getElementById('ingredientsPlaceholder').style.display = 'none';
  document.getElementById('pricesPlaceholder').style.display = 'none';
  const ingRow = createIngredientRow(ing);
  document.getElementById('ingredientsBody').appendChild(ingRow);
  document.getElementById('pricesBody').appendChild(createPriceRow(ing));
  lucide.createIcons();
  saveState();
  setTimeout(() => { const input = ingRow.querySelector('input[type="text"]'); if (input) input.focus(); }, 50);
}

function deleteIngredient(id) {
  const idx = state.ingredients.findIndex(i => i.id === id);
  if (idx === -1) return;
  state.ingredients.splice(idx, 1);
  document.querySelector(`#ingredientsBody tr[data-id="${id}"]`)?.remove();
  document.querySelector(`#pricesBody tr[data-id="${id}"]`)?.remove();
  if (state.ingredients.length === 0) {
    document.getElementById('ingredientsPlaceholder').style.display = 'block';
    document.getElementById('pricesPlaceholder').style.display = 'block';
  }
  lucide.createIcons();
  updateTotals();
}

function onIngredientInput(id, field, value) {
  const ing = state.ingredients.find(i => i.id === id);
  if (!ing) return;
  ing[field] = ['amount', 'price', 'packageWeight'].includes(field) ? validateNumber(value, 0) : value;
  if (field === 'name') document.querySelector(`#pricesBody tr[data-id="${id}"] [data-name-cell]`)?.replaceChildren(document.createTextNode(value || '—'));
  updateTotals();
}

function renderAllIngredients() {
  const ingBody = document.getElementById('ingredientsBody');
  const priceBody = document.getElementById('pricesBody');
  ingBody.innerHTML = '';
  priceBody.innerHTML = '';
  const empty = state.ingredients.length === 0;
  document.getElementById('ingredientsPlaceholder').style.display = empty ? 'block' : 'none';
  document.getElementById('pricesPlaceholder').style.display = empty ? 'block' : 'none';
  state.ingredients.forEach(ing => { ingBody.appendChild(createIngredientRow(ing)); priceBody.appendChild(createPriceRow(ing)); });
}

function createExtraCostRow(cost) {
  const div = document.createElement('div');
  div.className = 'flex flex-wrap sm:flex-nowrap items-center gap-2 extra-cost-row';
  div.dataset.id = cost.id;
  div.innerHTML = `<input type="text" value="${escapeHtml(cost.name)}" placeholder="Название расхода" oninput="onExtraCostInput(${cost.id}, 'name', this.value)" class="input-field flex-1 min-w-0 !h-11 !text-sm order-1 sm:order-none"><input type="number" step="any" min="0" inputmode="decimal" value="${cost.amount}" placeholder="0.00" oninput="onExtraCostInput(${cost.id}, 'amount', parseFloat(this.value) || 0)" class="input-field w-24 sm:w-28 shrink-0 min-w-0 !h-11 !text-sm order-2 sm:order-none"><button onclick="deleteExtraCost(${cost.id})" class="w-8 h-8 shrink-0 flex items-center justify-center text-dark/30 hover:text-red-500 transition-colors order-3 sm:order-none" title="Удалить"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
  return div;
}

function addExtraCost() {
  const cost = { id: generateId(), name: '', amount: 0 };
  state.extraCosts.push(cost);
  const row = createExtraCostRow(cost);
  document.getElementById('extraCostsContainer').appendChild(row);
  lucide.createIcons();
  saveState();
  setTimeout(() => row.querySelector('input[type="text"]')?.focus(), 50);
}

function deleteExtraCost(id) {
  const idx = state.extraCosts.findIndex(c => c.id === id);
  if (idx === -1) return;
  state.extraCosts.splice(idx, 1);
  document.querySelector(`#extraCostsContainer div[data-id="${id}"]`)?.remove();
  updateTotals();
}

function onExtraCostInput(id, field, value) {
  const cost = state.extraCosts.find(c => c.id === id);
  if (!cost) return;
  cost[field] = field === 'amount' ? validateNumber(value, 0) : value;
  const extraTotal = calculateExtraCostsTotal();
  document.getElementById('extraCostsTotal').textContent = `${extraTotal.toFixed(2)} ₽`;
  if (state.result) renderResults();
  saveState();
}

function renderAllExtraCosts() {
  const container = document.getElementById('extraCostsContainer');
  container.innerHTML = '';
  state.extraCosts.forEach(cost => container.appendChild(createExtraCostRow(cost)));
  document.getElementById('extraCostsTotal').textContent = `${calculateExtraCostsTotal().toFixed(2)} ₽`;
}

function renderResults() {
  if (!state.result) { document.getElementById('resultsSection').classList.add('hidden'); return; }
  document.getElementById('resultsSection').classList.remove('hidden');
  document.getElementById('roundResultsCheckbox').checked = state.result.roundResults;
  const k = state.result.coefficient;
  const pct = ((k - 1) * 100).toFixed(0);
  document.getElementById('resultCoefficientBadge').innerHTML = `<i data-lucide="calculator" class="w-4 h-4"></i><span>Коэффициент: ×${k.toFixed(2)} (порция ${pct >= 0 ? 'увеличена' : 'уменьшена'} на ${Math.abs(pct)}%)</span>`;
  document.getElementById('resultsBody').innerHTML = state.ingredients.map(ing => {
    const amount = validateNumber(ing.amount, 0) * k;
    const display = state.result.roundResults ? Math.round(amount) : amount.toFixed(1);
    return `<tr class="border-b border-soft/60"><td class="text-base">${escapeHtml(ing.name) || 'Без названия'}</td><td class="text-right text-xl font-bold text-caramel">${display} <span class="text-sm font-normal text-dark/50">${ing.unit}</span></td></tr>`;
  }).join('');
  document.getElementById('resultItemsCount').textContent = state.ingredients.length;
  document.getElementById('resultTotalWeight').textContent = `${calculateTotalWeight()} г`;
  const ingredientsCost = calculateIngredientsCost();
  const extraCostsTotal = calculateExtraCostsTotal();
  const hasCosts = ingredientsCost > 0 || extraCostsTotal > 0 || state.ingredients.some(ing => ing.price > 0);
  if (hasCosts) {
    document.getElementById('resultCostSection').classList.remove('hidden');
    document.getElementById('resultIngredientsCost').textContent = `${ingredientsCost.toFixed(2)} ₽`;
    document.getElementById('resultExtraCostsTotal').textContent = `${extraCostsTotal.toFixed(2)} ₽`;
    document.getElementById('resultTotalCost').textContent = `${(ingredientsCost + extraCostsTotal).toFixed(2)} ₽`;
  } else document.getElementById('resultCostSection').classList.add('hidden');
  lucide.createIcons();
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
  const content = document.getElementById('pricesAccordionContent');
  const icon = document.getElementById('pricesAccordionIcon');
  content.classList.toggle('hidden');
  icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
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
function loadDemoRecipe() { state = JSON.parse(JSON.stringify(DEMO_RECIPE)); saveState(); renderAll(); lucide.createIcons(); showToast('Демо-рецепт «Классический бисквит» загружен'); }
function clearAll() {
  if (state.ingredients.length === 0 && state.extraCosts.length === 0 && !state.recipeName) return;
  if (!confirm('Очистить все поля? Это действие нельзя отменить.')) return;
  state = JSON.parse(JSON.stringify(DEFAULT_STATE)); saveState(); renderAll(); lucide.createIcons(); showToast('Все поля очищены');
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

function saveState() { try { localStorage.setItem('bakecalc_state', JSON.stringify(state)); } catch (e) { console.warn('Save error:', e); } }
function loadState() {
  try {
    const saved = localStorage.getItem('bakecalc_state');
    if (!saved) return;
    const parsed = JSON.parse(saved);
    state = {
      recipeName: parsed.recipeName || '',
      originalForm: { ...DEFAULT_STATE.originalForm, ...(parsed.originalForm || {}) },
      newForm: { ...DEFAULT_STATE.newForm, ...(parsed.newForm || {}) },
      useHeightOriginal: !!parsed.useHeightOriginal,
      useHeightNew: !!parsed.useHeightNew,
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients.map(ing => ({ ...ing, packageUnit: ing.packageUnit || ing.unit || 'г' })) : [],
      extraCosts: Array.isArray(parsed.extraCosts) ? parsed.extraCosts : JSON.parse(JSON.stringify(DEFAULT_STATE.extraCosts)),
      result: parsed.result || null
    };
  } catch (e) { console.warn('Load error:', e); state = JSON.parse(JSON.stringify(DEFAULT_STATE)); }
}
function renderAll() {
  document.getElementById('recipeNameInput').value = state.recipeName;
  document.getElementById('useHeightOriginal').checked = state.useHeightOriginal;
  document.getElementById('useHeightNew').checked = state.useHeightNew;
  renderFormTabs('originalForm'); renderFormTabs('newForm'); renderFormFields('originalForm'); renderFormFields('newForm'); renderAllIngredients(); renderAllExtraCosts(); renderResults();
}
window.addEventListener('DOMContentLoaded', () => { loadState(); renderAll(); lucide.createIcons(); });
