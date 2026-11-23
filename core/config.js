import { defineConfig } from '@playwright/test';

function milliseconds(key, fallback) {
  const value = Number(process.env[key] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('Недопустимый тайм-аут ' + key);
  return value;
}

export default defineConfig({
  testDir: './autotest',
  workers: 1,
  preserveOutput: 'never',
  outputDir: process.env.PW_OUTPUT_DIR || 'test-results',
  retries: 0,
  timeout: milliseconds('QA_TEST_TIMEOUT', 100_000),
  expect: { timeout: milliseconds('QA_EXPECT_TIMEOUT', 12_000) },
  reporter: [
    [process.env.QA_DEMO === '1' ? './core/demo-reporter.js' : 'list'],
    ['allure-playwright', { resultsDir: process.env.ALLURE_RESULTS_DIR || 'allure-results', detail: false, suiteTitle: false }]
  ],
  use: {
    baseURL: process.env.QA_BASE_URL || 'https://elements-stroy.ru',
    channel: process.env.PW_BROWSER_CHANNEL || 'msedge',
    launchOptions: { slowMo: process.env.QA_DEMO === '1' ? 400 : 0 },
    viewport: { width: 1440, height: 950 },
    locale: 'ru-RU',
    actionTimeout: milliseconds('QA_ACTION_TIMEOUT', 15_000),
    navigationTimeout: milliseconds('QA_NAV_TIMEOUT', 35_000),
    screenshot: 'off',
    trace: 'off',
    video: 'off'
  }
});

