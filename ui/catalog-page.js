import { expect } from '@playwright/test';
import { BasePage, exactText } from './base-page.js';

export function rubles(text) {
  const match = text.replace(/[\s\u00a0\u202f]/g, '').match(/(\d+(?:[.,]\d+)?)руб/);
  if (!match) throw new Error('Не удалось прочитать сумму в рублях.');
  return Number(match[1].replace(',', '.'));
}

export class CatalogPage extends BasePage {
  async searchAndOpen(product) {
    await this.open('/');
    const search = this.page.locator('#title-search-input_fixed');
    await search.fill(product.query);
    await search.press('Enter');
    await expect(this.page).toHaveURL(url => url.pathname === '/catalog/' && url.searchParams.get('q') === product.query);
    const link = this.page.locator('a[href]').filter({ hasText: exactText(product.name) }).filter({ visible: true }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(this.page.locator('h1')).toHaveText(product.name);
  }

  async verifyProduct(product) {
    const card = this.page.locator('.catalog_detail');
    await expect(card.locator('.article__value').first()).toHaveText(product.sku);
    await expect(card.locator('.item-stock .store_view:visible').first()).toHaveText('Есть в наличии');
    const price = card.locator('.price_group').filter({ hasText: 'Розничная цена' }).locator('.price_value').filter({visible:true}).first();
    await expect(price).toBeVisible();
    const value = rubles((await price.innerText()) + ' руб.');
    expect(value).toBeGreaterThan(0);
    return value;
  }

  async addToCart() {
    const card = this.page.locator('.catalog_detail');
    await card.locator('.to-cart.btn-lg:visible').click();
    await expect(card.locator('.in-cart.btn-lg:visible').filter({visible:true}).first()).toBeVisible();
  }
}
