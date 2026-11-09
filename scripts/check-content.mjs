// Проверка контента: npm run content:check
// Ошибки останавливают сборку, предупреждения только печатаются.
import { readFile, readdir, access } from 'node:fs/promises';
import { join, basename } from 'node:path';
import * as yaml from 'js-yaml';

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const OUTCOMES = new Set(['best', 'ok', 'partial', 'false_block', 'miss', 'policy']);
const TRUTH = new Set(['attack', 'legit', 'policy']);
const KINDS = { email: 'email', call: 'phone_call', alert: 'alert' };
const DECISIONS = ['allow', 'block', 'escalate'];
const FIELD = /\[\[([\w.-]+)\|/g;

const load = async p => {
  try { return yaml.load(await readFile(p, 'utf8')); }
  catch (e) { if (e.name === 'YAMLException') throw new Error(`${p}: YAML не читается: ${e.reason} (строка ${e.mark?.line + 1})`); throw e; }
};
const exists = async p => { try { await access(p); return true; } catch { return false; } };
const keysIn = (node, acc = new Set()) => {
  if (typeof node === 'string') for (const m of node.matchAll(FIELD)) acc.add(m[1]);
  else if (Array.isArray(node)) node.forEach(n => keysIn(n, acc));
  else if (node && typeof node === 'object') Object.values(node).forEach(n => keysIn(n, acc));
  return acc;
};

// ---------- мир: с какой смены доступен каждый ключ справочника ----------
const W = 'content/world';
const rules = await load(`${W}/rules.yaml`);
const people = await load(`${W}/people.yaml`);
const contr = await load(`${W}/contractors.yaml`);
const camp = await load(`${W}/campaign.yaml`);

const keyDay = new Map();
const mark = (node, day) => { for (const k of keysIn(node)) if (!keyDay.has(k) || keyDay.get(k) > day) keyDay.set(k, day); };
for (const g of ['rules', 'threats']) for (const r of rules[g] ?? []) {
  if (keyDay.has(r.key)) err(`${W}/rules.yaml`, `ключ ${r.key} повторяется`);
  keyDay.set(r.key, r.day);
}
for (const s of people.staff ?? []) {
  const days = Object.keys(s.status ?? {}).map(Number);
  if (!days.length) err(`${W}/people.yaml`, `у ${s.id} нет status`);
  for (const [d, v] of Object.entries(s.status ?? {})) mark(v, Number(d));
  mark([s.name, s.dept, s.phone], Math.min(...days));
}
mark(people.it_support, 1);
for (const c of [...(contr.contractors ?? []), ...(contr.software ?? [])]) {
  mark([c.name, c.contract, c.lines], c.day);
  if (c.warning) mark(c.warning.text, c.warning.day);
}
mark(contr.access_matrix?.rows, contr.access_matrix?.day ?? 1);

const dayNums = new Set((camp.days ?? []).map(d => d.n));
const upgradeIds = new Set((camp.upgrades ?? []).map(u => u.id));
const allPeople = [...(people.staff ?? []), ...(people.external ?? []), ...(people.team ?? [])];
const personIds = new Set(allPeople.map(p => p.id));
for (const p of allPeople) {
  if (p.portrait && !(await exists(`public/assets/portraits/${p.portrait}`))) warn(`${W}/people.yaml`, `портрет ${p.portrait} для ${p.id} ещё не загружен`);
}
for (const u of camp.upgrades ?? []) if (!u.name || !(u.cost > 0)) err(`${W}/campaign.yaml`, `покупка ${u.id}: нужны name и cost`);

// ---------- кейсы ----------
async function* files(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* files(p); else if (e.name.endsWith('.yaml')) yield p;
  }
}

const cases = [];
const ids = new Map();
for await (const f of files('content/cases')) {
  let c;
  try { c = await load(f); } catch (e) { err(f, e.message.replace(`${f}: `, '')); continue; }
  if (!c?.id) { err(f, 'нет id'); continue; }
  cases.push({ f, c });
  if (ids.has(c.id)) err(f, `id «${c.id}» уже есть в ${ids.get(c.id)}`); else ids.set(c.id, f);
  if (basename(f, '.yaml') !== c.id) err(f, `имя файла должно совпадать с id «${c.id}»`);
  if (!f.includes(`/day${c.day}/`)) err(f, `day: ${c.day}, а файл лежит в другой папке`);
  if (!dayNums.has(c.day)) err(f, `смены ${c.day} нет в campaign.yaml`);
  for (const k of ['order', 'kind', 'type', 'title', 'truth', 'outcomes', 'key', 'debrief']) if (c[k] == null) err(f, `нет поля ${k}`);

  if (c.kind && !KINDS[c.kind]) err(f, `kind «${c.kind}» — допустимо: ${Object.keys(KINDS).join(', ')}`);
  else if (c.kind && !c[KINDS[c.kind]]) err(f, `для kind: ${c.kind} нужен блок ${KINDS[c.kind]}`);

  if (c.truth && !TRUTH.has(c.truth)) err(f, `truth «${c.truth}» — допустимо: ${[...TRUTH].join(', ')}`);
  for (const d of DECISIONS) if (!OUTCOMES.has(c.outcomes?.[d])) err(f, `outcomes.${d} = «${c.outcomes?.[d]}» — допустимо: ${[...OUTCOMES].join(', ')}`);
  const o = c.outcomes ?? {};
  if (c.truth === 'attack' && o.allow !== 'miss') err(f, 'у атаки пропуск должен быть miss');
  if (c.truth === 'legit' && (o.allow !== 'ok' || o.block !== 'false_block')) err(f, 'у легитимного: allow ok, block false_block');
  if (c.truth === 'policy' && o.allow !== 'policy') err(f, 'у кейса по регламенту пропуск должен быть policy');
  if (DECISIONS.some(d => o[d] === 'partial') && !c.partial_note) err(f, 'есть исход partial, но нет partial_note');
  if (!DECISIONS.some(d => o[d] === 'best' || o[d] === 'ok')) err(f, 'нет ни одного верного решения');

  // слои
  const layers = c.layers ?? [];
  const declared = new Set();
  for (const l of layers) {
    if (declared.has(l.id)) err(f, `слой ${l.id} описан дважды`); declared.add(l.id);
    if (!l.label || !(l.cost > 0)) err(f, `слой ${l.id}: нужны label и cost > 0`);
    if (l.needs && !upgradeIds.has(l.needs)) err(f, `слой ${l.id}: needs «${l.needs}» — нет такой покупки`);
  }
  const used = new Set();
  const useLayer = (l, where) => { if (!l) return; used.add(l); if (!declared.has(l)) err(f, `${where}: слой «${l}» не описан в layers`); };
  for (const [i, b] of (c.blocks ?? []).entries()) {
    useLayer(b.layer, `blocks[${i}]`);
    const kinds = ['note', 'table', 'headers'].filter(k => b[k] != null);
    if (kinds.length !== 1) err(f, `blocks[${i}]: нужен ровно один из note, table, headers`);
    for (const r of [...(b.table ?? []), ...(b.headers ?? [])]) if (!Array.isArray(r) || r.length !== 2) err(f, `blocks[${i}]: строка должна быть из двух ячеек: ${JSON.stringify(r)}`);
    if (b.at && !['top', 'bottom'].includes(b.at)) err(f, `blocks[${i}].at: top или bottom`);
  }
  useLayer(c.email?.from_addr?.layer, 'email.from_addr');
  useLayer(c.email?.link?.layer, 'email.link');
  useLayer(c.phone_call?.number?.layer, 'phone_call.number');
  for (const l of declared) if (!used.has(l)) warn(f, `слой «${l}» описан, но ничего не раскрывает`);
  if (c.email?.flag?.upgrade && !upgradeIds.has(c.email.flag.upgrade)) err(f, `email.flag: нет покупки «${c.email.flag.upgrade}»`);
  for (const t of c.phone_call?.transcript ?? []) if (!Array.isArray(t) || t.length !== 2) err(f, `реплика должна быть [кто, текст]: ${JSON.stringify(t)}`);

  // люди
  for (const [where, id] of [['email.sender', c.email?.sender], ['phone_call.caller', c.phone_call?.caller], ['call.person', c.call?.person], ['ticket_person', c.ticket_person]])
    if (id && !personIds.has(id)) err(f, `${where}: нет персонажа «${id}» в people.yaml`);

  // улики
  const local = keysIn(c);
  for (const e of c.evidence ?? []) {
    if (!Array.isArray(e) || e.length !== 3) { err(f, `улика должна быть [ключ, ключ, текст]: ${JSON.stringify(e)}`); continue; }
    const [a, b, text] = e;
    if (a === b) err(f, `улика сравнивает поле само с собой: ${a}`);
    for (const k of [a, b]) {
      if (local.has(k)) continue;
      if (!keyDay.has(k)) err(f, `улика ссылается на несуществующее поле «${k}»`);
      else if (keyDay.get(k) > c.day) err(f, `поле «${k}» появляется в справочнике только со смены ${keyDay.get(k)}`);
    }
    if (!text) err(f, `у улики ${a} × ${b} нет текста находки`);
  }
  if ((c.truth === 'attack' || c.truth === 'policy') && !(c.evidence?.length)) err(f, 'у атаки или нарушения нет ни одной улики');

  if (!c.call?.label || !c.call?.text) warn(f, 'нет проверки по второму каналу (call)');
  if (c.requires_call && !c.call) err(f, 'requires_call без call');
  if (!c.debrief?.name || !c.debrief?.text) err(f, 'в debrief нужны name и text');
  if (c.loyalty_cost) for (const d of Object.keys(c.loyalty_cost)) if (!DECISIONS.includes(d)) err(f, `loyalty_cost.${d}: неизвестное решение`);
}

// ---------- условия и флаги ----------
// флаг → значения и самый ранний кейс (смена, порядок), который его выставляет
const produced = new Map();
const before = (a, b) => a.day < b.day || (a.day === b.day && a.order < b.order);
for (const { c } of cases) for (const d of DECISIONS) for (const [k, v] of Object.entries(c.fx?.[d] ?? {})) {
  const at = { day: c.day, order: c.order };
  if (!produced.has(k)) produced.set(k, { values: new Set(), first: at });
  const p = produced.get(k); p.values.add(v); if (before(at, p.first)) p.first = at;
}
// at — момент, когда условие проверяется: кейс (смена и порядок) или утро смены (order 0).
function checkWhen(where, w, at) {
  if (!w) return;
  for (const part of ['flags', 'not_flags']) for (const [k, v] of Object.entries(w[part] ?? {})) {
    const p = produced.get(k);
    if (!p) err(where, `условие на флаг «${k}», который никто не выставляет`);
    else if (!p.values.has(v)) err(where, `флаг «${k}» не принимает значение «${v}» (бывает: ${[...p.values].join(', ')})`);
    else if (at && !before(p.first, at)) err(where, `флаг «${k}» впервые выставляется в смене ${p.first.day} (кейс №${p.first.order}), то есть позже, чем нужен`);
  }
  for (const u of [w.upgrade, w.no_upgrade]) if (u && !upgradeIds.has(u)) err(where, `нет покупки «${u}»`);
  const extra = Object.keys(w).filter(k => !['flags', 'not_flags', 'upgrade', 'no_upgrade'].includes(k));
  if (extra.length) err(where, `неизвестные поля условия: ${extra.join(', ')}`);
}
for (const { f, c } of cases) checkWhen(f, c.when, { day: c.day, order: c.order });
for (const [i, n] of (camp.news ?? []).entries()) checkWhen(`campaign.yaml news[${i}]`, n.when, { day: n.day, order: 0 });
for (const [i, o] of (camp.chain?.outcomes ?? []).entries()) checkWhen(`campaign.yaml chain.outcomes[${i}]`, o.when);

// порядок внутри смены
const byDay = new Map();
for (const { f, c } of cases) {
  const k = `${c.day}:${c.order}`;
  if (byDay.has(k)) err(f, `order ${c.order} в смене ${c.day} уже занят (${byDay.get(k)})`); else byDay.set(k, f);
}

// ---------- итог ----------
const count = d => cases.filter(x => x.c.day === d).length;
if (warnings.length) console.warn(`Предупреждения (${warnings.length}):\n- ` + warnings.join('\n- '));
if (errors.length) { console.error(`Ошибки в контенте (${errors.length}):\n- ` + errors.join('\n- ')); process.exit(1); }
console.log(`Контент в порядке: кейсов ${cases.length} (по сменам: ${[...dayNums].map(count).join(' / ')}), покупок ${upgradeIds.size}, флагов ${produced.size}`);
