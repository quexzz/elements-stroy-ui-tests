import { test as base, expect } from '@playwright/test';
import pino from 'pino';
import * as allure from 'allure-js-commons';
import { redact } from './redact.js';

async function attachScreenshot(page, info, name, region) {
  const mask = [page.locator('input, textarea, .personal-link, .auth_wr_inner, .bx-soa-customer, #bx-soa-properties, [class*=user-name], [class*=profile-name]')];
  const options = { mask, animations: 'disabled', timeout: 6000 };
  const candidates = [region, page.locator('#bx-soa-total:visible').first(),
    page.locator('#auth-page-form:visible').first(), page.locator('h1:visible').first()];
  let target;
  for (const candidate of candidates) {
    if (candidate && await candidate.isVisible()) { target = candidate; break; }
  }
  const body = target ? await target.screenshot(options) : await page.screenshot({
    ...options, style: 'body * { color: transparent !important; text-shadow: none !important; }'
  });
  await info.attach(name, { body, contentType: 'image/png' });
}

export const test = base.extend({
  journal: async ({ page }, use, info) => {
    const lines = [];
    const requestedLevel = (process.env.LOG_LEVEL || 'debug').toLowerCase();
    const level = requestedLevel === 'warning' ? 'warn' : requestedLevel;
    const logger = pino({
      level, base: null, timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: label => ({ level: label.toUpperCase() }) }
    }, { write: line => lines.push(redact(line.trimEnd())) });
    function log(severity, message) {
      const method = severity === 'WARNING' ? 'warn' : severity.toLowerCase();
      logger[method](redact(message));
    }
    const [caseId] = info.title.split(' · ');
    await allure.label('caseId', caseId);
    await allure.parameter('Тест-кейс', caseId);
    const journal = {
      log,
      async parameters(values) {
        for (const [name, value] of Object.entries(values)) await allure.parameter(name, value);
      },
      step: (name, action) => test.step(name, async () => {
        log('INFO', name);
        log('DEBUG', 'Начато действие или ожидание: ' + name);
        try {
          const result = await action();
          log('DEBUG', 'Шаг завершен');
          return result;
        } catch (error) {
          log('ERROR', 'Сбой при выполнении шага «' + name + '»');
          throw error;
        }
      }),
      screenshot: name => attachScreenshot(page, info, name)
    };
    log('DEBUG', 'Открыт изолированный контекст браузера');
    await use(journal);
    if (info.status !== info.expectedStatus) {
      log('ERROR', 'Проверка завершилась ошибкой. Подробности — в шаге отчёта.');
      try { await attachScreenshot(page, info, 'Страница при падении'); }
      catch (error) {
        const reason = page.isClosed() ? 'Страница браузера закрыта.'
          : redact(String(error.message || error.name).split('\n')[0]);
        log('ERROR', 'Снимок недоступен: ' + reason);
        await info.attach('Причина отсутствия снимка', { body: reason, contentType: 'text/plain' });
      }
    }
    await info.attach('Журнал прогона', { body: Buffer.from(lines.join('\n'), 'utf8'), contentType: 'text/plain' });
  }
});
export { expect };
