import { expect } from '@playwright/test';
import { BasePage } from './base-page.js';
import { BaseElement } from './base-element.js';

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.form = page.locator('#auth-page-form');
    this.login = this.form.locator('[name=USER_LOGIN]');
    this.password = this.form.locator('[name=USER_PASSWORD]');
    this.logout = page.locator('a[href*="logout=yes"]');
  }

  async visit() {
    await this.open('/auth/');
    await expect(this.form).toBeVisible();
  }

  async submit(login, password) {
    await new BaseElement(this.login, 'Логин').fill(login);
    await new BaseElement(this.password, 'Пароль').fill(password);
    await this.form.locator('button[type=submit][name=Login1]').click();
  }

  async expectCabinet(expectedLogin) {
    await expect.poll(() => this.logout.count(), { message: 'После входа должна появиться ссылка выхода' }).toBeGreaterThan(0);
    await this.open('/personal/');
    await expect(this.page).toHaveURL(/\/personal\/(?:\?.*)?$/);
    await expect(this.page.locator('h1')).toHaveText(/(?:личный|мой) кабинет|персональный раздел/i);
    await expect(this.form).toHaveCount(0);
    await expect.poll(() => this.logout.count()).toBeGreaterThan(0);
    const profileLink = this.page.locator('a[href="/personal/private/"]').first();
    await expect(profileLink).toBeAttached();
    const profile = await this.page.context().newPage();
    try {
      await new BasePage(profile).open(await profileLink.getAttribute('href'));
      await expect(profile).toHaveURL(/\/personal\/private\/(?:\?.*)?$/);
      const email = profile.locator('input[name="EMAIL"]');
      await expect(email).toBeVisible();
      await expect.poll(async () => {
        const actual = (await email.inputValue()).trim().toLowerCase();
        return Boolean(expectedLogin) && actual === expectedLogin.trim().toLowerCase();
      }, { message: 'Email в профиле должен совпасть с логином учебной записи' }).toBe(true);
    } finally {
      await profile.close();
    }
  }

  async expectRejection(example) {
    if (example.server) {
      const error = this.page.locator('xpath=.//*[normalize-space(text())="Неверный логин или пароль."]').filter({visible:true}).first();
      await expect(error).toBeVisible();
    } else {
      for (const [key, id] of [['login', 'USER_LOGIN_POPUP'], ['password', 'USER_PASSWORD_POPUP']]) {
        const error = this.form.locator('#' + id + '-error');
        if (example.fields.includes(key)) {
          await expect(error).toBeVisible();
          await expect(error).toHaveText(/заполните это поле/i);
        } else {
          await expect(error).toBeHidden();
        }
      }
    }
    await expect(this.form).toBeVisible();
    await this.open('/personal/');
    await expect(this.page.locator('form:visible input[name=USER_PASSWORD]').first()).toBeVisible();
    await expect(this.logout).toHaveCount(0);
  }
}
