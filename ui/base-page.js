export class BasePage {
  constructor(page) { this.page = page; }

  async open(path) {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }
}

export function exactText(text) {
  const escaped = text.replace(/[.*+?^$()|[\]\\]/g, '\\$&').trim().split(/\s+/).join('\\s+');
  return new RegExp('^\\s*' + escaped + '\\s*$');
}
