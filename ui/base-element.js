export class BaseElement {
  constructor(locator, name) {
    this.locator = locator;
    this.name = name;
  }

  async fill(value) {
    try {
      await this.locator.fill(value);
    } catch {
      // В исходном сообщении Playwright может оказаться введенное значение.
      throw new Error('Не удалось заполнить поле «' + this.name + '».');
    }
  }
}
