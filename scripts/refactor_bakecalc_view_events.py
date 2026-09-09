from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js' / 'app.js'
HTML = ROOT / 'bakecalc.html'
README = ROOT / 'README.md'
REVIEW = ROOT / 'docs' / 'repository-review.md'


def replace_function(text, name, next_name, replacement):
    pattern = rf'^function {re.escape(name)}\([^\n]*\) \{{.*?^\}}\n+(?=function {re.escape(next_name)}\()'
    text, count = re.subn(pattern, replacement.rstrip() + '\n\n', text, count=1, flags=re.M | re.S)
    if count != 1:
        raise RuntimeError(f'Could not replace function {name}')
    return text


app = APP.read_text(encoding='utf-8')

app = replace_function(app, 'showToast', 'generateId', """function showToast(message) {
  BakeCalcView.showToast(message);
}""")

app = replace_function(app, 'updateTotals', 'renderFormTabs', """function updateTotals() {
  const extraTotal = calculateExtraCostsTotal();
  BakeCalcView.updateExtraCostsTotal(extraTotal);
  if (state.result) renderResults();
  saveState();
}""")

app = replace_function(app, 'renderFormTabs', 'renderFormFields', """function renderFormTabs(formKey) {
  BakeCalcView.renderFormTabs(formKey, state);
}""")
app = replace_function(app, 'renderFormFields', 'createIngredientRow', """function renderFormFields(formKey) {
  BakeCalcView.renderFormFields(formKey, state);
}""")
app = replace_function(app, 'createIngredientRow', 'createPriceRow', """function createIngredientRow(ingredient) {
  return BakeCalcView.createIngredientRow(ingredient);
}""")
app = replace_function(app, 'createPriceRow', 'addIngredient', """function createPriceRow(ingredient) {
  return BakeCalcView.createPriceRow(ingredient);
}""")

app = replace_function(app, 'addIngredient', 'deleteIngredient', """function addIngredient() {
  const ingredient = { id: generateId(), name: '', amount: 0, unit: 'г', price: 0, packageWeight: 1000, packageUnit: 'г' };
  state.ingredients.push(ingredient);
  renderAllIngredients();
  saveState();
  BakeCalcView.focusLastIngredient();
}""")
app = replace_function(app, 'deleteIngredient', 'onIngredientInput', """function deleteIngredient(id) {
  const index = state.ingredients.findIndex(item => item.id === id);
  if (index === -1) return;
  state.ingredients.splice(index, 1);
  renderAllIngredients();
  updateTotals();
}""")
app = replace_function(app, 'onIngredientInput', 'renderAllIngredients', """function onIngredientInput(id, field, value) {
  const ingredient = state.ingredients.find(item => item.id === id);
  if (!ingredient) return;
  ingredient[field] = ['amount', 'price', 'packageWeight'].includes(field) ? validateNumber(value, 0) : value;
  if (field === 'name') BakeCalcView.updatePriceName(id, value);
  updateTotals();
}""")
app = replace_function(app, 'renderAllIngredients', 'createExtraCostRow', """function renderAllIngredients() {
  BakeCalcView.renderAllIngredients(state);
}""")
app = replace_function(app, 'createExtraCostRow', 'addExtraCost', """function createExtraCostRow(cost) {
  return BakeCalcView.createExtraCostRow(cost);
}""")
app = replace_function(app, 'addExtraCost', 'deleteExtraCost', """function addExtraCost() {
  state.extraCosts.push({ id: generateId(), name: '', amount: 0 });
  renderAllExtraCosts();
  saveState();
  BakeCalcView.focusLastExtraCost();
}""")
app = replace_function(app, 'deleteExtraCost', 'onExtraCostInput', """function deleteExtraCost(id) {
  const index = state.extraCosts.findIndex(item => item.id === id);
  if (index === -1) return;
  state.extraCosts.splice(index, 1);
  renderAllExtraCosts();
  updateTotals();
}""")
app = replace_function(app, 'onExtraCostInput', 'renderAllExtraCosts', """function onExtraCostInput(id, field, value) {
  const cost = state.extraCosts.find(item => item.id === id);
  if (!cost) return;
  cost[field] = field === 'amount' ? validateNumber(value, 0) : value;
  BakeCalcView.updateExtraCostsTotal(calculateExtraCostsTotal());
  if (state.result) renderResults();
  saveState();
}""")
app = replace_function(app, 'renderAllExtraCosts', 'renderResults', """function renderAllExtraCosts() {
  BakeCalcView.renderAllExtraCosts(state, calculateExtraCostsTotal());
}""")
app = replace_function(app, 'renderResults', 'onRecipeNameInput', """function renderResults() {
  BakeCalcView.renderResults({
    state,
    totalWeight: calculateTotalWeight(),
    ingredientsCost: calculateIngredientsCost(),
    extraCostsTotal: calculateExtraCostsTotal()
  });
}""")

app = replace_function(app, 'togglePricesAccordion', 'toggleRoundResults', """function togglePricesAccordion() {
  BakeCalcView.togglePricesAccordion();
}""")

old_render_all = """function renderAll() {
  document.getElementById('recipeNameInput').value = state.recipeName;
  document.getElementById('useHeightOriginal').checked = state.useHeightOriginal;
  document.getElementById('useHeightNew').checked = state.useHeightNew;
  renderFormTabs('originalForm'); renderFormTabs('newForm'); renderFormFields('originalForm'); renderFormFields('newForm'); renderAllIngredients(); renderAllExtraCosts(); renderResults();
}
window.addEventListener('DOMContentLoaded', () => { loadState(); renderAll(); lucide.createIcons(); });"""
new_render_all = """function renderAll() {
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
});"""
if old_render_all not in app:
    raise RuntimeError('Could not replace renderAll/bootstrap block')
app = app.replace(old_render_all, new_render_all, 1)

if '.innerHTML =' in app or 'document.createElement' in app:
    raise RuntimeError('app.js still contains direct template rendering')
APP.write_text(app, encoding='utf-8')

html = HTML.read_text(encoding='utf-8')
replacements = {
    '<button onclick="clearAll()"': '<button type="button" data-action="clear-all"',
    'id="recipeNameInput" placeholder="Например: Морковный торт" oninput="onRecipeNameInput(this.value)"': 'id="recipeNameInput" data-action="recipe-name" placeholder="Например: Морковный торт"',
    '<button onclick="addIngredient()"': '<button type="button" data-action="add-ingredient"',
    '<button onclick="loadDemoRecipe()"': '<button type="button" data-action="load-demo"',
    '<button onclick="togglePricesAccordion()"': '<button type="button" data-action="toggle-prices"',
    'id="useHeightOriginal" onchange="toggleHeight(\'original\')"': 'id="useHeightOriginal" data-action="toggle-height" data-form-target="original"',
    'id="useHeightNew" onchange="toggleHeight(\'new\')"': 'id="useHeightNew" data-action="toggle-height" data-form-target="new"',
    '<button onclick="addExtraCost()"': '<button type="button" data-action="add-extra-cost"',
    '<button onclick="calculateRecipe()"': '<button type="button" data-action="calculate"',
    'id="roundResultsCheckbox" onchange="toggleRoundResults()"': 'id="roundResultsCheckbox" data-action="round-results"',
    '<button onclick="copyRecipe()"': '<button type="button" data-action="copy-recipe"',
    '<button onclick="recalculate()"': '<button type="button" data-action="recalculate"'
}
for old, new in replacements.items():
    if old not in html:
        raise RuntimeError(f'Missing expected HTML fragment: {old[:70]}')
    html = html.replace(old, new, 1)

if re.search(r'\s(?:onclick|oninput|onchange|onsubmit)\s*=', html, re.I):
    raise RuntimeError('Inline event handler remains in bakecalc.html')

old_scripts = '<script src="js/bakecalc-math.js"></script>\n<script src="js/bakecalc-state.js"></script>\n<script src="js/app.js"></script>'
new_scripts = '<script src="js/bakecalc-math.js"></script>\n<script src="js/bakecalc-state.js"></script>\n<script src="js/bakecalc-view.js"></script>\n<script src="js/bakecalc-events.js"></script>\n<script src="js/app.js"></script>'
if old_scripts not in html:
    raise RuntimeError('BakeCalc runtime script block not found')
html = html.replace(old_scripts, new_scripts, 1)
HTML.write_text(html, encoding='utf-8')

readme = README.read_text(encoding='utf-8')
needle = 'Чистая математика вынесена в `js/bakecalc-math.js`'
if needle in readme and 'BakeCalcView' not in readme:
    readme += '\n\n## Архитектура BakeCalc\n\nBakeCalc постепенно выведен из legacy-монолита: `bakecalc-math.js` отвечает за чистые расчёты, `bakecalc-state.js` — за состояние/хранилище, `bakecalc-view.js` — за DOM-рендеринг, `bakecalc-events.js` — за делегированные события, а `app.js` остаётся контроллером пользовательских действий. Inline `onclick/oninput/onchange` на странице BakeCalc больше не используются.\n'
README.write_text(readme, encoding='utf-8')

review = REVIEW.read_text(encoding='utf-8')
review = review.replace(
    '- `js/bakecalc-math.js` + legacy `js/app.js` и `js/bakecalc-hardening.js`;',
    '- BakeCalc: `js/bakecalc-math.js` + `js/bakecalc-state.js` + `js/bakecalc-view.js` + `js/bakecalc-events.js` + контроллер `js/app.js` + временный compatibility-слой `js/bakecalc-hardening.js`;'
)
review = review.replace(
    '2. **BakeCalc остаётся наиболее legacy-страницей.** Первый этап рефакторинга уже отделил состояние/`localStorage` и сделал runtime-зависимости явными; следующая цель — вынести DOM-рендеринг и события из `js/app.js` без изменения интерфейса.',
    '2. **BakeCalc всё ещё имеет legacy-контроллер.** Состояние, DOM-рендеринг и события уже разделены; следующий этап — убрать оставшиеся monkey-patch переопределения из `js/bakecalc-hardening.js` и затем сократить глобальный API `app.js`.'
)
REVIEW.write_text(review, encoding='utf-8')
