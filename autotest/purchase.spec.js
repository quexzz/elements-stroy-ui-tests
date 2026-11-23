import { fileURLToPath } from 'node:url';
import { test } from '../core/fixtures.js';
import { account, buyer, product, requireAccount } from '../core/data.js';
import { LoginPage } from '../ui/login-page.js';
import { CatalogPage } from '../ui/catalog-page.js';
import { BasketPage } from '../ui/basket-page.js';
import { CheckoutPage } from '../ui/checkout-page.js';

const sessionFile = process.env.SHOP_SESSION_FILE;
if (sessionFile) test.use({ storageState: sessionFile });

test('TC-C20 · От входа до готовности оформить заказ', async ({ page, journal }, testInfo) => {
  await testInfo.attach('Тестовые данные', {
    path: fileURLToPath(new URL('../report/Тестовые данные.pdf', import.meta.url)),
    contentType: 'application/pdf'
  });
  await journal.parameters({ 'Товар': product.name, 'Количество': '1', 'Завершение': 'Проверка итоговой формы до отправки' });
  const login = new LoginPage(page);
  const catalog = new CatalogPage(page);
  const basket = new BasketPage(page);
  const checkout = new CheckoutPage(page);
  const firstStep = sessionFile ? 'Проверить сессию после ручного входа в Edge' : 'Войти и сверить email владельца кабинета';
  await journal.step(firstStep, async () => {
    if (sessionFile) {
      await login.open('/personal/');
    } else {
      requireAccount();
      await login.visit();
      await login.submit(account.login, account.password);
    }
    await login.expectCabinet(account.login);
  });
  await journal.step('Проверить предусловие — пустая корзина', () => basket.expectEmpty());
  await journal.step('Найти «Алебастр» и открыть «Алебастр 10 кг»', () => catalog.searchAndOpen(product));
  const price = await journal.step('Сверить артикул 5358, наличие и розничную цену', () => catalog.verifyProduct(product));
  try {
    await journal.step('Добавить одну единицу товара', () => catalog.addToCart());
    await journal.step('Сверить в корзине товар, количество, цену и итог', () => basket.verify(product.name, price));
    await journal.step('Перейти к оформлению', () => basket.checkout());
    await journal.step('Заполнить контакты физлица и выбрать самовывоз', () => checkout.preparePickup(buyer));
    await journal.step('Проверить оплату, итог и кнопку оформления', () => checkout.verifyReady(price));
    journal.log('WARNING', 'Заказ не отправлен.');
    await journal.screenshot('Оформление до отправки заказа');
  } catch (error) {
    await journal.screenshot('Страница в момент сбоя').catch(() => {});
    throw error;
  } finally {
    await journal.step('Убрать добавленную тестом позицию', () => basket.removeTestProduct(product.name));
  }
});
