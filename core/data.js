import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export const account = {
  login: process.env.SHOP_LOGIN || '',
  password: process.env.SHOP_PASSWORD || ''
};

export function requireAccount() {
  if (!account.login || !account.password) {
    throw new Error('Для этого теста нужны SHOP_LOGIN и SHOP_PASSWORD действующей учебной записи.');
  }
}

const defaultProduct = { query: 'Алебастр', name: 'Алебастр 10 кг', sku: '5358' };
const defaultBuyer = { name: 'Тестов Тест Тестович', email: 'qa.order@example.test', phone: '79000000001' };


const source = process.env.QA_DATA_FILE;
const supplied = source ? JSON.parse(readFileSync(source, 'utf8').replace(/^\uFEFF/, '')) : {};
export const product = { ...defaultProduct, ...supplied.product };
export const buyer = { ...defaultBuyer, ...supplied.buyer };

export function negativeExamples() {
  const absent = 'qa-' + randomUUID().slice(0, 12) + '@example.invalid';
  const wrong = 'Wrong!' + randomUUID();
  const valid = account.password;
  const rejected = 'Ошибка авторизации; кабинет закрыт';
  const required = 'Подсказка у пустого поля; кабинет закрыт';
  const sets = [
    {
      id: 'TC-A02', title: 'Неверный пароль существующей записи', login: account.login, password: wrong, server: true,
      loginClass: 'Зарегистрированный', passwordClass: 'Неверный', expected: rejected
    },
    {
      id: 'TC-A03', title: 'Несуществующий аккаунт', login: absent, password: valid, server: true,
      loginClass: 'Незарегистрированный', passwordClass: 'Действующий', expected: rejected
    },
    {
      id: 'TC-A03.Ф', title: 'Email без домена', login: 'student@', password: valid, server: true,
      loginClass: 'Без домена', passwordClass: 'Действующий', expected: rejected
    },
    {
      id: 'TC-A04', title: 'Пустой логин', login: '', password: valid, fields: ['login'],
      loginClass: 'Пустой', passwordClass: 'Действующий', expected: required
    },
    {
      id: 'TC-A05', title: 'Пустой пароль', login: account.login, password: '', fields: ['password'],
      loginClass: 'Зарегистрированный', passwordClass: 'Пустой', expected: required
    },
    {
      id: 'TC-A04 + TC-A05', title: 'Оба обязательных поля пусты', login: '', password: '', fields: ['login', 'password'],
      loginClass: 'Пустой', passwordClass: 'Пустой', expected: 'Подсказки у обоих полей; кабинет закрыт'
    },
  ];
  return sets.map(example => ({
    ...example,
    needsCredentials: example.loginClass === 'Зарегистрированный' || example.passwordClass === 'Действующий',
    parameters: {
      'Идентификатор': 'Email', 'Логин': example.loginClass,
      'Пароль': example.passwordClass, 'Ожидается': example.expected
    }
  }));
}
