import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdir, readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redact } from './redact.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const id = process.env.QA_DEMO_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-');
if (!/^[\w-]+$/.test(id)) throw new Error('Некорректный идентификатор прогона.');
const run = path.join(root, 'runs', id);
const raw = path.join(run, 'allure-results');
const html = path.join(run, 'report');
await mkdir(raw, { recursive: true });
const env = { ...process.env, ALLURE_RESULTS_DIR: raw, PW_OUTPUT_DIR: path.join(run, 'browser') };

function execute(relativeFile, args) {
  const child = spawn(process.execPath, [path.join(root, relativeFile), ...args], {
    cwd: root, env, stdio: ['ignore', 'pipe', 'pipe']
  });
  for (const [stream, output] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
    const lines = createInterface({ input: stream, crlfDelay: Infinity });
    lines.on('line', line => output.write(redact(line) + '\n'));
  }
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', code => resolve(code ?? 1));
  });
}

const status = await execute('node_modules/@playwright/test/cli.js', ['test', ...process.argv.slice(2)]);

// Playwright добавляет текстовый снимок DOM при падении. Он может содержать данные профиля.
async function sanitizeDiagnostics(node) {
  if (!node || typeof node !== 'object') return;
  if (node.statusDetails) {
    for (const key of ['message', 'trace']) {
      if (node.statusDetails[key]) node.statusDetails[key] = redact(node.statusDetails[key]);
    }
  }
  if (Array.isArray(node.attachments)) {
    for (const item of node.attachments.filter(x => x.name === 'error-context')) {
      await unlink(path.join(raw, path.basename(item.source))).catch(e => { if (e.code !== 'ENOENT') throw e; });
    }
    node.attachments = node.attachments.filter(x => x.name !== 'error-context');
  }
  for (const child of Object.values(node)) {
    if (typeof child === 'object') await sanitizeDiagnostics(child);
  }
}

for (const filename of await readdir(raw)) {
  if (!filename.endsWith('.json')) continue;
  const file = path.join(raw, filename);
  const result = JSON.parse(await readFile(file, 'utf8'));
  await sanitizeDiagnostics(result);
  await writeFile(file, JSON.stringify(result));
}
if (env.QA_DEMO === '1') console.log('\n06 / Логирование и Allure — формирование отчета этого прогона');
const rendered = await execute('node_modules/allure/cli.js', ['generate', raw, '--output', html, '--config', 'allurerc.mjs']);
if (rendered === 0) console.log('Отчет:', path.join(html, 'index.html'));
process.exitCode = status || rendered;
