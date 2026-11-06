// Проверка контента: npm run content:check
// Ловит дубли id, неверные исходы, улики со ссылкой на несуществующие поля, слои без описания.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import * as yaml from 'js-yaml';

const OUTCOMES = new Set(['best', 'ok', 'partial', 'false', 'miss', 'policy']);
const TRUTH = new Set(['attack', 'legit', 'policy']);
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const fieldKeys = (node, acc = new Set()) => {
  if (typeof node === 'string') for (const m of node.matchAll(/\[\[([\w.-]+)\|/g)) acc.add(m[1]);
  else if (Array.isArray(node)) node.forEach(n => fieldKeys(n, acc));
  else if (node && typeof node === 'object') Object.values(node).forEach(n => fieldKeys(n, acc));
  return acc;
};
const layerRefs = (node, acc = new Set()) => {
  if (Array.isArray(node)) node.forEach(n => layerRefs(n, acc));
  else if (node && typeof node === 'object') {
    if (typeof node.layer === 'string') acc.add(node.layer);
    Object.entries(node).forEach(([k, v]) => { if (k !== 'layers') layerRefs(v, acc); });
  }
  return acc;
};

const dir = yaml.load(await readFile('content/directory.yaml', 'utf8'));
const globalKeys = fieldKeys(dir);
for (const group of ['rules', 'threats']) for (const r of dir[group] ?? []) globalKeys.add(r.key);

async function* files(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* files(p); else if (e.name.endsWith('.yaml')) yield p;
  }
}

const ids = new Map();
let n = 0;
for await (const f of files('content/cases')) {
  n++;
  let c;
  try { c = yaml.load(await readFile(f, 'utf8')); } catch (e) { err(f, `YAML не читается: ${e.message}`); continue; }
  if (!c?.id) { err(f, 'нет id'); continue; }
  if (ids.has(c.id)) err(f, `id «${c.id}» уже есть в ${ids.get(c.id)}`); ids.set(c.id, f);
  for (const k of ['day', 'kind', 'title', 'truth', 'outcomes', 'key', 'debrief']) if (c[k] == null) err(f, `нет поля ${k}`);
  if (c.truth && !TRUTH.has(c.truth)) err(f, `truth «${c.truth}» — допустимо: ${[...TRUTH].join(', ')}`);
  for (const d of ['allow', 'block', 'escalate']) {
    const o = c.outcomes?.[d];
    if (!OUTCOMES.has(o)) err(f, `outcomes.${d} = «${o}» — допустимо: ${[...OUTCOMES].join(', ')}`);
  }
  const local = fieldKeys(c);
  for (const [a, b, text] of c.evidence ?? []) {
    for (const k of [a, b]) if (!local.has(k) && !globalKeys.has(k)) err(f, `улика ссылается на несуществующее поле «${k}»`);
    if (!text) err(f, `у улики ${a} × ${b} нет текста находки`);
  }
  const declared = new Set((c.layers ?? []).map(l => l.id));
  for (const l of layerRefs(c)) if (!declared.has(l)) err(f, `слой «${l}» используется, но не описан в layers`);
  if (c.truth === 'attack' && !(c.evidence?.length)) err(f, 'у атаки нет ни одной улики');
}

if (errors.length) { console.error(`Ошибки в контенте (${errors.length}):\n- ` + errors.join('\n- ')); process.exit(1); }
console.log(`Контент в порядке: кейсов ${n}`);
