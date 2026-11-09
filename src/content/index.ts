// Загрузка контента из content/*.yaml. Vite встраивает файлы в сборку как текст,
// поэтому игра работает и на GitHub Pages, и из архива itch.io без запросов к серверу.
import { load } from 'js-yaml';
import type { Case, Content, Flags, When, World } from './types';

const raw = import.meta.glob('/content/**/*.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function file<T>(path: string): T {
  const text = raw[path];
  if (text == null) throw new Error(`Нет файла контента ${path}`);
  return load(text) as T;
}

export function loadContent(): Content {
  const rules = file<any>('/content/world/rules.yaml');
  const people = file<any>('/content/world/people.yaml');
  const contr = file<any>('/content/world/contractors.yaml');
  const camp = file<any>('/content/world/campaign.yaml');

  const world: World = {
    rules: rules.rules, threats: rules.threats, escalationsPerShift: rules.escalations_per_shift,
    staff: people.staff, external: people.external ?? [], managers: people.managers, itSupport: people.it_support,
    contractors: contr.contractors, software: contr.software, accessMatrix: contr.access_matrix,
    days: camp.days, news: camp.news ?? [], budget: camp.budget, upgrades: camp.upgrades, chain: camp.chain,
  };

  const cases = Object.entries(raw)
    .filter(([p]) => p.startsWith('/content/cases/'))
    .map(([, text]) => load(text) as Case)
    .sort((a, b) => a.day - b.day || a.order - b.order);

  return { world, cases };
}

// ---------- помощники, общие для движка и интерфейса ----------

/** Подходит ли условие под текущие флаги и покупки. */
export function matches(when: When | undefined, flags: Flags, upgrades: Set<string>): boolean {
  if (!when) return true;
  for (const [k, v] of Object.entries(when.flags ?? {})) if (flags[k] !== v) return false;
  for (const [k, v] of Object.entries(when.not_flags ?? {})) if (flags[k] === v) return false;
  if (when.upgrade && !upgrades.has(when.upgrade)) return false;
  if (when.no_upgrade && upgrades.has(when.no_upgrade)) return false;
  return true;
}

/** Значение, действующее в смене day, из записи вида { 1: «…», 3: «…» }. */
export function byDay<T>(values: Record<number, T> | undefined, day: number): T | undefined {
  if (!values) return undefined;
  let best: T | undefined; let bestDay = -Infinity;
  for (const [d, v] of Object.entries(values)) { const n = Number(d); if (n <= day && n > bestDay) { best = v; bestDay = n; } }
  return best;
}

export type Piece = { text: string; key?: string };

/** Разбивает строку с уликами [[ключ|текст]] на куски для отрисовки. */
export function parseFields(s: string): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of s.matchAll(/\[\[([\w.-]+)\|([^\]]*)\]\]/g)) {
    if (m.index! > last) out.push({ text: s.slice(last, m.index) });
    out.push({ key: m[1], text: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

/** Убирает разметку улик, оставляя текст. */
export const plain = (s: string) => s.replace(/\[\[[\w.-]+\|([^\]]*)\]\]/g, '$1');
