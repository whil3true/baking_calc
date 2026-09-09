import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const browser = await chromium.launch({ headless: true });

async function runSmoke(name, path, action, resultSelector, valueSelector) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(`${baseURL}/${path}`, { waitUntil: 'domcontentloaded' });
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

try {
  await runSmoke(
    'BakeCalc',
    'bakecalc.html',
    async page => {
      await page.getByRole('button', { name: 'Загрузить тестовый рецепт' }).click();
      await page.getByRole('button', { name: 'Рассчитать новый рецепт' }).click();
    },
    '#resultsSection',
    '#resultCoefficientBadge'
  );

  await runSmoke(
    'CreamCalc',
    'creamcalc.html',
    page => page.getByRole('button', { name: 'Рассчитать крем' }).click(),
    '#creamResults',
    '#creamPrepare'
  );

  await runSmoke(
    'PortionCalc',
    'portioncalc.html',
    page => page.getByRole('button', { name: 'Рассчитать размер торта' }).click(),
    '#portionResults',
    '#portionRecommendedSize'
  );

  await runSmoke(
    'GelatinCalc',
    'gelatincalc.html',
    page => page.getByRole('button', { name: 'Пересчитать желатин' }).click(),
    '#gelatinResults',
    '#gelatinConverted'
  );

  await runSmoke(
    'ConverterCalc',
    'convertercalc.html',
    async page => {
      await page.locator('#density').fill('0.8');
      await page.getByRole('button', { name: 'Конвертировать' }).click();
    },
    '#converterResults',
    '#converterResultValue'
  );
} finally {
  await browser.close();
}
