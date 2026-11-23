import path from 'node:path';
import { readFileSync } from 'node:fs';

const statusText = {
  passed: 'ПРОЙДЕН',
  failed: 'ОШИБКА',
  timedOut: 'ИСТЕКЛО ВРЕМЯ',
  skipped: 'ПРОПУЩЕН',
  interrupted: 'ПРЕРВАН'
};

export default class DemoReporter {
  onBegin(config, suite) {
    this.project = config.projects[0];
    this.tests = suite.allTests();
    this.total = this.tests.length;
    this.index = 0;
    console.log('01 / Выбор сайта');
    console.log(this.project.use.baseURL);
    console.log('Запланировано тестов: ' + this.total);
    this.listOnly = process.argv.includes('--list');
    if (this.listOnly) for (const test of this.tests) console.log('  ' + test.title);
  }

  onTestBegin(test) {
    const isLogin = path.basename(test.location.file) === 'login.spec.js';
    const section = isLogin ? '02 / Авторизация' : '03 / Сквозной сценарий';
    if (this.section !== section) {
      console.log('\n' + section);
      if (!isLogin) console.log('Проверяем оформление до отправки заказа.');
      this.section = section;
    }
    this.stepNumber = 0;
    this.index++;
    console.log('\n[' + this.index + '/' + this.total + '] ' + test.title);
  }

  onStepBegin(test, result, step) {
    if (step.category === 'test.step' && !step.parent) {
      console.log('  Шаг ' + (++this.stepNumber) + '. ' + step.title);
    }
  }

  onTestEnd(test, result) {
    console.log('  Результат: ' + statusText[result.status]);
    if (result.error) this.onError(result.error);
  }

  onError(error) {
    const message = (error.message || error.value || 'Ошибка запуска').trim();
    console.error(message.split(/\r?\n/)[0]);
  }

  onEnd(run) {
    if (!this.tests || this.listOnly) return;
    const statuses = this.tests.map(test => test.results.at(-1)?.status);
    const passed = statuses.filter(status => status === 'passed').length;
    const failed = statuses.filter(status => status === 'failed' || status === 'timedOut').length;
    console.log('\nИтог: пройдено ' + passed + ' из ' + this.total +
      ', ошибок: ' + failed + ', пропущено или прервано: ' + (this.total - passed - failed) + '.');
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    console.log('\n04 / Технологии и архитектура');
    console.log('Playwright Test ' + manifest.devDependencies['@playwright/test'] +
      ', Node.js ' + process.versions.node + '. Код тестов: autotest, объекты страниц: ui, настройки: core.');
    console.log('\n05 / Устойчивость и условия запуска');
    console.log('Браузер: ' + this.project.use.channel + '. Лимит действия: ' +
      this.project.use.actionTimeout / 1000 + ' с, теста: ' + this.project.timeout / 1000 + ' с.');
    if (run.status === 'passed' && (passed !== this.total || this.total === 0)) return { status: 'failed' };
  }

  printsToStdio() { return true; }
}
