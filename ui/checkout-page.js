import { expect } from '@playwright/test';
import { BasePage } from './base-page.js';
import { BaseElement } from './base-element.js';
import { rubles } from './catalog-page.js';

export class CheckoutPage extends BasePage {
  constructor(page) {
    super(page);
    this.summary = page.locator('#bx-soa-total');
    this.submitOrder = this.summary.locator('a.btn-order-save:visible');
  }

  async preparePickup(buyer) {
    await expect(this.page.locator('h1')).toHaveText('Оформление заказа');
    const customer = this.page.locator('#bx-soa-properties');
    const name = customer.locator('#soa-property-1');
    const editCustomer = customer.locator('xpath=.//*[normalize-space(text())="Изменить"]').filter({ visible: true });
    await name.or(editCustomer).filter({ visible: true }).first().waitFor();
    if (!await name.isVisible()) await editCustomer.click();
    await expect(customer.locator('input[name=PERSON_TYPE][value="1"]')).toBeChecked();
    const email = customer.locator('#soa-property-2');
    const phone = customer.locator('#soa-property-3');
    await new BaseElement(name, 'Ф.И.О.').fill(buyer.name);
    await new BaseElement(email, 'E-Mail').fill(buyer.email);
    await new BaseElement(phone, 'Телефон').fill(buyer.phone);
    await phone.blur();
    expect(await name.inputValue() === buyer.name).toBe(true);
    expect(await email.inputValue() === buyer.email).toBe(true);
    expect((await phone.inputValue()).replace(/\D/g, '').endsWith(buyer.phone.slice(-10))).toBe(true);
    const delivery = this.page.locator('#bx-soa-delivery');
    await customer.locator('.bx-soa-more-btn:visible').click();
    const pickup = delivery.locator('.bx-soa-pp-company').filter({hasText:'Самовывоз'});
    const pickupTitle = pickup.locator('xpath=.//*[normalize-space(text())="Самовывоз"]');
    const editDelivery = delivery.locator('xpath=.//*[normalize-space(text())="Изменить"]').filter({ visible: true });
    await pickupTitle.or(editDelivery).filter({ visible:true }).first().waitFor();
    if (!await pickupTitle.isVisible()) await editDelivery.click();
    await pickup.locator('xpath=.//*[normalize-space(text())="Самовывоз"]').click();
    await expect(pickup).toHaveClass(/bx-selected/);
    await expect(pickup).toContainText(/Старые Кузьменки/i);
    await expect(delivery.locator('.ADDRESS input:visible, .ADDRESS textarea:visible')).toHaveCount(0);
    await delivery.locator('.bx-soa-more-btn:visible').click();
  }

  async verifyReady(amount) {
    const delivery = this.page.locator('#bx-soa-delivery');
    await expect(delivery.locator('.bx-selected').first()).toContainText('Самовывоз');
    await expect(this.summary.locator('xpath=.//*[normalize-space(text())="Оплата в магазине"]')).toBeVisible();
    await expect(this.summary.locator('xpath=.//*[normalize-space(text())="Самовывоз"]')).toBeVisible();
    const total = this.summary.locator('xpath=.//span[normalize-space(.)="Итого:"]/following-sibling::span[1]');
    await expect.poll(async () => rubles(await total.innerText())).toBe(amount);
    await expect(this.submitOrder).toBeVisible();
    await expect(this.submitOrder).toBeEnabled();
    const consent = this.summary.locator('.bx-soa-cart-conditions-text:visible');
    await expect(consent).toContainText(/нажимая на кнопку/i);
    await expect(consent.locator('a[href]').first()).toHaveText(/обработку персональных данных/i);
    await expect(consent.locator('a[href]').last()).toHaveText(/публичной офертой/i);
  }
}
