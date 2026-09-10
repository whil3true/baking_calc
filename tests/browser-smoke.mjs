import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });

async function assertSeo(page, name) {
  const canonical = page.locator('link[rel="canonical"]');
  await canonical.waitFor({ state: 'attached' });
  const href = await canonical.getAttribute('href');
  assert.ok(href?.startsWith('https://konditercalc.ru/'), `${name}: canonical URL missing`);
  const structured = page.locator('#konditercalc-structured-data');
  await structured.waitFor({ state: 'attached' });
  const json = await structured.textContent();
  assert.doesNotThrow(() => JSON.parse(json || ''), `${name}: invalid JSON-LD`);
}

async function runSmoke(name, path, action, resultSelector, valueSelector) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(`${baseURL}/${path}`, { waitUntil: 'domcontentloaded' });
    await assertSeo(page, name);
    await action(page);
    await page.locator(resultSelector).waitFor({ state: 'visible' });
    const value = (await page.locator(valueSelector).textContent())?.trim();
    assert.ok(value, `${name}: result value is empty`);
    assert.deepEqual(pageErrors, [], `${name}: browser JavaScript errors: ${pageErrors.join(' | ')}`);
    console.log(`✓ ${name}: ${value}`);
  } finally {
    await page.close();
  }
}

async function runBakeCalcDelegatedEvents() {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(`${baseURL}/bakecalc.html`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Добавить ингредиент' }).click();
    const ingredientRow = page.locator('#ingredientsBody tr').last();
    await ingredientRow.locator('[data-field="name"]').fill('Тестовая мука');
    await ingredientRow.locator('[data-field="amount"]').fill('125');
    assert.equal(await page.locator('#pricesBody tr').last().locator('[data-name-cell]').textContent(), 'Тестовая мука');

    await page.locator('#originalFormTabs [data-form-type="rect"]').click();
    await page.locator('#originalFormFields [data-field="length"]').waitFor({ state: 'visible' });
    await page.locator('#originalFormFields [data-field="length"]').fill('22');
    await page.locator('#originalFormFields [data-field="width"]').fill('18');

    await page.locator('#useHeightOriginal').check();
    await page.locator('#originalFormFields [data-field="height"]').waitFor({ state: 'visible' });

    assert.deepEqual(pageErrors, [], `BakeCalc delegated events: browser JavaScript errors: ${pageErrors.join(' | ')}`);
    console.log('✓ BakeCalc delegated events: dynamic input, form switch and height toggle');
  } finally {
    await page.close();
  }
}

async function runBakeCalcPriceCalcIntegration() {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(`${baseURL}/bakecalc.html`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Загрузить тестовый рецепт' }).click();
    await page.getByRole('button', { name: 'Рассчитать новый рецепт' }).click();

    const transferLink = page.locator('#openPriceCalc');
    await transferLink.waitFor({ state: 'visible' });
    const href = await transferLink.getAttribute('href');
    assert.match(href || '', /^\/raschet-ceny-torta\/\?/);
    assert.match(href || '', /source=bakecalc/);
    assert.match(href || '', /ingredientsCost=/);
    assert.match(href || '', /packagingCost=/);
    assert.match(href || '', /extraCost=/);

    await transferLink.click();
    await page.waitForURL(url => url.pathname.endsWith('/raschet-ceny-torta/'));
    await page.locator('#priceForm').waitFor({ state: 'visible' });

    const ingredientsCost = Number(await page.locator('#ingredientsCost').inputValue());
    const extraCost = Number(await page.locator('#extraCost').inputValue());
    const packagingCost = Number(await page.locator('#packagingCost').inputValue());
    assert.ok(ingredientsCost > 0, 'BakeCalc → PriceCalc: ingredient cost was not transferred');
    assert.ok(extraCost > 0, 'BakeCalc → PriceCalc: extra cost was not transferred');
    assert.ok(packagingCost > 0, 'BakeCalc → PriceCalc: packaging cost was not transferred');
    assert.match(await page.locator('#priceStatus').textContent() || '', /перенесена из BakeCalc/i);
    assert.equal(new URL(page.url()).search, '', 'BakeCalc → PriceCalc: transfer query should be cleaned after import');
    assert.deepEqual(pageErrors, [], `BakeCalc → PriceCalc: browser JavaScript errors: ${pageErrors.join(' | ')}`);
    console.log(`✓ BakeCalc → PriceCalc: ingredients ${ingredientsCost} ₽, packaging ${packagingCost} ₽, extras ${extraCost} ₽`);
  } finally {
    await page.close();
  }
}

try {
  await runSmoke('BakeCalc', 'pereschet-recepta/', async page => {
    await page.getByRole('button', { name: 'Загрузить тестовый рецепт' }).click();
    await page.getByRole('button', { name: 'Рассчитать новый рецепт' }).click();
  }, '#resultsSection', '#resultCoefficientBadge');

  await runBakeCalcDelegatedEvents();
  await runSmoke('CreamCalc', 'raschet-krema-dlya-torta/', page => page.getByRole('button', { name: 'Рассчитать крем' }).click(), '#creamResults', '#creamPrepare');
  await runSmoke('PortionCalc', 'razmer-torta-po-gostyam/', page => page.getByRole('button', { name: 'Рассчитать размер торта' }).click(), '#portionResults', '#portionRecommendedSize');
  await runSmoke('GelatinCalc', 'pereschet-zhelatina-bloom/', page => page.getByRole('button', { name: 'Пересчитать желатин' }).click(), '#gelatinResults', '#gelatinConverted');
  await runSmoke('ConverterCalc', 'konverter-ingredientov/', async page => {
    await page.locator('#density').fill('0.8');
    await page.getByRole('button', { name: 'Конвертировать' }).click();
  }, '#converterResults', '#converterResultValue');
  await runSmoke('PriceCalc', 'raschet-ceny-torta/', page => page.getByRole('button', { name: 'Рассчитать цену' }).click(), '#priceResults', '#priceSalePrice');
  await runBakeCalcPriceCalcIntegration();
} finally {
  await browser.close();
}
