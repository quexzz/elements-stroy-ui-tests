import { account, buyer } from './data.js';

export function redact(message) {
  let safe = String(message);
  for (const value of [account.password, account.login, buyer.name, buyer.phone, buyer.email].filter(Boolean)) {
    safe = safe.replaceAll(value, '***');
  }
  return safe.replace(/(\b(?:authorization|set-cookie|cookie)\s*:\s*)[^\r\n]+/gi, '$1***')
    .replace(/([?&](?:sessid|token|access_token|refresh_token|sessionid|auth|key)=)[^&\s"'<>]+/gi, '$1***')
    .replace(/[\w.+-]+@[\w.-]+\.\w+/gi, '***')
    .replace(/(?<!\d)(?:\+?7|8)[\s()-]*\d(?:[\s()-]*\d){9}(?!\d)/g, '***');
}
