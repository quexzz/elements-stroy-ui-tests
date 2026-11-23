import { test } from '../core/fixtures.js';
import { account, negativeExamples, requireAccount } from '../core/data.js';
import { LoginPage } from '../ui/login-page.js';

test.describe('Авторизация', () => {
  test('TC-A01 · Вход по логину и паролю', async ({ page, journal }) => {
    await journal.parameters({ 'Идентификатор': 'Email', 'Логин': 'Зарегистрированный', 'Пароль': 'Действующий', 'Ожидается': 'Кабинет указанного пользователя' });
    const manualEntry = process.env.SHOP_MANUAL_LOGIN === '1';
    test.skip(!manualEntry && Boolean(process.env.SHOP_SESSION_FILE) && !account.password, 'Вход выполнен пользователем в Edge. Для повтора из чистой сессии требуется пароль.');
    test.skip(manualEntry && !account.login, 'Для сверки профиля укажите SHOP_LOGIN.');
    if (manualEntry) test.setTimeout(300_000);
    else requireAccount();
    const login = new LoginPage(page);
    await journal.step('Открыть форму входа в чистой сессии', () => login.visit());
    if (manualEntry) {
      await journal.step('Дождаться входа пользователя через открытую форму в Edge', async () => {
        await page.bringToFront();
        await login.logout.first().waitFor({ state: 'attached', timeout: 270_000 });
      });
    } else {
      await journal.step('Ввести действующие логин и пароль', () => login.submit(account.login, account.password));
    }
    await journal.step('Сверить email в профиле с логином учебной записи', () => login.expectCabinet(account.login));
    await journal.screenshot('Личный кабинет после входа');
  });

  for (const example of negativeExamples()) {
    test(example.id + ' · ' + example.title, async ({ page, journal }) => {
      await journal.parameters(example.parameters);
      test.skip(example.needsCredentials && (!account.login || !account.password), 'Нужна действующая учебная запись');
      const login = new LoginPage(page);
      await journal.step('Открыть форму входа', () => login.visit());
      await journal.step('Отправить данные выбранного класса', () => login.submit(example.login, example.password));
      await journal.step('Проверить ошибку формы и отказ в доступе к кабинету', () => login.expectRejection(example));
    });
  }
});
