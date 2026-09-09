/* BakeCalc delegated UI events. Keeps inline handlers out of HTML/templates. */
const BakeCalcEvents = (() => {
  'use strict';

  let bound = false;

  function closestAction(target) {
    return target instanceof Element ? target.closest('[data-action]') : null;
  }

  function rowId(node) {
    const owner = node.closest('[data-id]');
    const id = Number(owner?.dataset.id);
    return Number.isFinite(id) ? id : null;
  }

  function numericValue(node) {
    const value = Number.parseFloat(node.value);
    return Number.isFinite(value) ? value : 0;
  }

  function bind(actions, root = document) {
    if (bound || !actions) return;
    bound = true;

    root.addEventListener('click', event => {
      const node = closestAction(event.target);
      if (!node) return;
      const action = node.dataset.action;
      if (!action) return;

      switch (action) {
        case 'clear-all': actions.clearAll(); break;
        case 'add-ingredient': actions.addIngredient(); break;
        case 'load-demo': actions.loadDemoRecipe(); break;
        case 'toggle-prices': actions.togglePricesAccordion(); break;
        case 'add-extra-cost': actions.addExtraCost(); break;
        case 'calculate': actions.calculateRecipe(); break;
        case 'copy-recipe': actions.copyRecipe(); break;
        case 'recalculate': actions.recalculate(); break;
        case 'form-type':
          actions.setFormType(node.dataset.formKey, node.dataset.formType);
          break;
        case 'delete-ingredient': {
          const id = rowId(node);
          if (id !== null) actions.deleteIngredient(id);
          break;
        }
        case 'delete-extra-cost': {
          const id = rowId(node);
          if (id !== null) actions.deleteExtraCost(id);
          break;
        }
        default: break;
      }
    });

    root.addEventListener('input', event => {
      const node = closestAction(event.target);
      if (!node) return;
      const action = node.dataset.action;
      if (action === 'recipe-name') {
        actions.onRecipeNameInput(node.value);
        return;
      }
      if (action === 'form-field') {
        actions.updateForm(node.dataset.formKey, node.dataset.field, numericValue(node));
        return;
      }
      if (action === 'ingredient-input' && node.tagName !== 'SELECT') {
        const id = rowId(node);
        if (id === null) return;
        const field = node.dataset.field;
        actions.onIngredientInput(id, field, field === 'name' ? node.value : numericValue(node));
        return;
      }
      if (action === 'extra-cost-input') {
        const id = rowId(node);
        if (id === null) return;
        const field = node.dataset.field;
        actions.onExtraCostInput(id, field, field === 'name' ? node.value : numericValue(node));
      }
    });

    root.addEventListener('change', event => {
      const node = closestAction(event.target);
      if (!node) return;
      const action = node.dataset.action;
      if (action === 'ingredient-input' && node.tagName === 'SELECT') {
        const id = rowId(node);
        if (id !== null) actions.onIngredientInput(id, node.dataset.field, node.value);
      } else if (action === 'toggle-height') {
        actions.toggleHeight(node.dataset.formTarget);
      } else if (action === 'round-results') {
        actions.toggleRoundResults();
      }
    });
  }

  return Object.freeze({ bind });
})();
