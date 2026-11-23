import { expect } from '@playwright/test';
import { BasePage, exactText } from './base-page.js';
import { rubles } from './catalog-page.js';

export class BasketPage extends BasePage {
  constructor(page) {
    super(page);
    this.rows = page.locator('tr[data-entity="basket-item"]');
  }

  async visit() {
    await this.open('/basket/');
    await expect(this.page.locator('h1')).toHaveText(/Корзина/i);
  }

  async expectEmpty() {
    await this.visit();
    await expect(this.page.locator('.bx-sbb-empty-cart-text').filter({visible:true}).first(),
      'Перед началом нужна пустая корзина учебной записи').toBeVisible();
  }

  row(name) {
    return this.rows.filter({ has: this.page.locator('a[href]').filter({ hasText: exactText(name) }) });
  }

  async verify(name, unitPrice) {
    await this.visit();
    const row = this.row(name);
    await expect(row).toHaveCount(1);
    await expect(this.rows).toHaveCount(1);
    await expect(row.locator('[data-entity="basket-item-quantity-field"]')).toHaveValue('1');
    const amounts = [row.locator('.basket-item-price-current-text'), row.locator('.basket-item-price-current-value'),
      this.page.locator('[data-entity="basket-total-price"]:visible').first()];
    for (const amount of amounts) {
      await expect.poll(async () => rubles(await amount.innerText()), { message: 'Цена позиции и итог должны совпасть с ценой карточки' }).toBe(unitPrice);
    }
  }

  async checkout() {
    await this.page.locator('button[data-entity="basket-checkout-button"]:visible').click();
    await expect(this.page).toHaveURL(/\/order\/(?:\?.*)?$/);
  }

  async removeTestProduct(name) {
    await this.visit();
    const row = this.row(name);
    if (await row.count() === 0) {
      await expect(this.page.locator('.bx-sbb-empty-cart-text').filter({visible:true}).first()).toBeVisible();
      return;
    }
    await row.hover();
    const [response] = await Promise.all([
      this.page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/sale.basket.basket/ajax.php') && r.request().method() === 'POST'),
      row.locator('[data-entity="basket-item-delete"]:visible').first().click()
    ]);
    await response.finished();
    expect(response.ok(), 'Сервер должен обработать изменение корзины').toBe(true);
    await expect(row.locator('[data-entity="basket-item-quantity-field"]')).toHaveCount(0);
    await this.expectEmpty();
  }
}
