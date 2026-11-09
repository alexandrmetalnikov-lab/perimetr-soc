// Движок смены. Чистая логика без DOM: состояние — обычный объект, функции его меняют
// и возвращают события для интерфейса. Правила перенесены из прототипа (public/prototypes/perimetr-v0.html).
import type { Case, Content, Decision, Flags, News, Outcome, Tone } from '../content/types';
import { matches } from '../content';

export const SCORE = { best: 15, ok: 10, partial: 10, violation: 3, miss: -25, policy: -10, falseBlockLoyalty: 20, warnPenalty: 10, freeWarnings: 2, unresolvedLoyalty: 5, noEvidence: -5, perEvidence: 3, maxEvidenceBonus: 3, eco: 3, callMinutes: 30 } as const;

export type Verdict = Outcome | 'violation' | 'unresolved';
export type Phase = 'intro' | 'morning' | 'shift' | 'report' | 'final';

export interface Finding { text: string; call?: boolean }
export interface CaseRun { revealed: string[]; spent: number; findings: Finding[]; called: boolean }
export interface Result {
  id: string; decision: Decision | null; verdict: Verdict; label: string; tone: Tone; note: string;
  findings: number; called: boolean; spent: number; eco: boolean; opened: string[];
}
export interface GameEvent { kind: 'warn' | 'info' | 'good'; title: string; text: string }

export interface GameState {
  day: number;
  phase: Phase;
  min: number;
  end: number;
  pts: number;
  dayStartPts: number;
  loyalty: number;
  warns: number;
  esc: number;
  escMax: number;
  overtime: boolean;
  flags: Flags;
  upgrades: string[];
  budget: number;
  earned: number;
  done: string[];
  runs: Record<string, CaseRun>;
  results: Result[];
  news: News[];
  history: { day: number; pts: number; missed: number; warns: number }[];
}

const LABEL: Record<Verdict, [string, Tone]> = {
  best: ['Верно', 'good'], ok: ['Верно', 'good'], partial: ['Частично', 'mid'], violation: ['Нарушение регламента', 'mid'],
  false_block: ['Ложная блокировка', 'bad'], miss: ['Атака пропущена', 'bad'], policy: ['Нарушение регламента', 'bad'], unresolved: ['Не разобрано', 'bad'],
};

export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function newGame(): GameState {
  return {
    day: 1, phase: 'intro', min: 0, end: 0, pts: 0, dayStartPts: 0, loyalty: 100, warns: 0, esc: 0, escMax: 0, overtime: false,
    flags: {}, upgrades: [], budget: 0, earned: 0, done: [], runs: {}, results: [], news: [], history: [],
  };
}

const dayOf = (c: Content, n: number) => c.world.days.find(d => d.n === n)!;
export const isLastDay = (c: Content, s: GameState) => s.day === Math.max(...c.world.days.map(d => d.n));

/** Начало смены: сбрасывает дневные счётчики, применяет утренние новости. */
export function startDay(c: Content, s: GameState, n: number): News[] {
  const d = dayOf(c, n);
  s.day = n; s.min = toMin(d.start); s.end = toMin(d.end);
  s.warns = 0; s.done = []; s.runs = {}; s.results = [];
  s.escMax = c.world.escalationsPerShift + (s.overtime ? 2 : 0); s.esc = s.escMax; s.overtime = false;
  const ups = new Set(s.upgrades);
  s.news = c.world.news.filter(x => x.day === n && matches(x.when, s.flags, ups));
  for (const x of s.news) { s.pts += x.effects?.pts ?? 0; s.loyalty += x.effects?.loyalty ?? 0; }
  s.dayStartPts = s.pts;
  s.phase = n === 1 ? 'intro' : 'morning';
  return s.news;
}

export function beginShift(s: GameState) { s.phase = 'shift'; }

/** Кейсы смены, которые сейчас в очереди (с учётом условий и уже разобранных). */
export function queue(c: Content, s: GameState): Case[] {
  const ups = new Set(s.upgrades);
  return c.cases.filter(x => x.day === s.day && (s.done.includes(x.id) || matches(x.when, s.flags, ups)));
}
export const current = (c: Content, s: GameState) => queue(c, s).find(x => !s.done.includes(x.id));

export function run(s: GameState, id: string): CaseRun {
  return (s.runs[id] ??= { revealed: [], spent: 0, findings: [], called: false });
}

/** Доступен ли инструмент: куплен или пробная лицензия в этой смене. */
export function hasTool(c: Content, s: GameState, tool: string): boolean {
  return s.upgrades.includes(tool) || (dayOf(c, s.day).trial ?? []).includes(tool);
}

export function reveal(c: Content, s: GameState, layerId: string): boolean {
  const cs = current(c, s); if (!cs || s.phase !== 'shift') return false;
  const l = cs.layers.find(x => x.id === layerId); const r = run(s, cs.id);
  if (!l || r.revealed.includes(l.id) || (l.needs && !hasTool(c, s, l.needs))) return false;
  r.revealed.push(l.id); r.spent += l.cost; s.min = Math.min(s.end, s.min + l.cost);
  return true;
}

function addFinding(r: CaseRun, f: Finding): boolean {
  if (r.findings.some(x => x.text === f.text)) return false;
  r.findings.push(f); return true;
}

/** Инспекция: два поля. Возвращает находку или null, если противоречия нет. */
export function inspect(c: Content, s: GameState, a: string, b: string): { text: string; fresh: boolean } | null {
  const cs = current(c, s); if (!cs || a === b) return null;
  const hit = (cs.evidence ?? []).find(([x, y]) => (x === a && y === b) || (x === b && y === a));
  if (!hit) return null;
  return { text: hit[2], fresh: addFinding(run(s, cs.id), { text: hit[2] }) };
}

/** Проверка по второму каналу. Стоит 30 минут, один раз на объект. */
export function secondChannel(c: Content, s: GameState): Case['call'] | null {
  const cs = current(c, s); if (!cs?.call || s.phase !== 'shift') return null;
  const r = run(s, cs.id); if (r.called) return null;
  r.called = true; s.min = Math.min(s.end, s.min + SCORE.callMinutes);
  addFinding(r, { text: cs.call.text, call: true });
  if (cs.call.finding) addFinding(r, { text: cs.call.finding });
  return cs.call;
}

function warn(s: GameState, text: string, out: GameEvent[]) {
  s.warns++;
  if (s.warns > SCORE.freeWarnings) { s.pts -= SCORE.warnPenalty; out.push({ kind: 'warn', title: `Предупреждение № ${s.warns} · штраф −${SCORE.warnPenalty}`, text }); }
  else out.push({ kind: 'warn', title: `Предупреждение № ${s.warns}`, text: `${text} Первые два за смену прощаются.` });
}

/** Решение по текущему объекту. */
export function decide(c: Content, s: GameState, d: Decision): { result: Result; events: GameEvent[] } | null {
  const cs = current(c, s); if (!cs || s.phase !== 'shift') return null;
  if (d === 'escalate') { if (s.esc <= 0) return null; s.esc--; }
  const r = run(s, cs.id); const events: GameEvent[] = [];
  const nf = r.findings.filter(f => !f.call).length;
  let v: Verdict = cs.outcomes[d];
  if (v === 'ok' && d === 'allow' && cs.requires_call && !r.called) v = 'violation';
  const notes: string[] = [];
  switch (v) {
    case 'best': s.pts += SCORE.best; break;
    case 'ok': s.pts += SCORE.ok; break;
    case 'partial': s.pts += SCORE.partial; notes.push(cs.partial_note ?? 'Угроза остановлена, но без расследования.'); break;
    case 'violation': s.pts += SCORE.violation; notes.push('Решение верное, но обязательную проверку по второму каналу пропустили.');
      warn(s, 'Нарушение регламента: решение принято без обязательной проверки по второму каналу.', events); break;
    case 'false_block': s.loyalty -= SCORE.falseBlockLoyalty;
      notes.push('Объект был легитимным. Бизнес недоволен.' + (d === 'escalate' ? ' Вторая линия потратила время впустую.' : ''));
      warn(s, `Ложная блокировка легитимного объекта. Лояльность бизнеса −${SCORE.falseBlockLoyalty}.`, events); break;
    case 'miss': s.pts += SCORE.miss; notes.push('Злоумышленник прошёл периметр.'); warn(s, 'Пропущена атака. Последствия ещё проявятся.', events); break;
    case 'policy': s.pts += SCORE.policy; notes.push('Регламент запрещал пропускать этот объект.'); warn(s, `Нарушение регламента: объект пропущен вопреки бюллетеню. ${SCORE.policy}.`, events); break;
  }
  if (cs.truth !== 'legit' && (v === 'best' || v === 'ok' || v === 'partial')) {
    if (nf === 0) { s.pts += SCORE.noEvidence; notes.push('Решение без обоснования: ни одной находки.'); }
    else s.pts += SCORE.perEvidence * Math.min(nf, SCORE.maxEvidenceBonus);
  }
  const lc = cs.loyalty_cost?.[d];
  if (lc) { s.loyalty -= lc; notes.push(`${cs.loyalty_note ?? 'Решение непопулярно.'} Лояльность −${lc}.`); }
  Object.assign(s.flags, cs.fx?.[d] ?? {});
  const eco = (v === 'best' || v === 'ok') && r.spent <= cs.par && (nf > 0 || cs.truth === 'legit');
  if (eco) s.pts += SCORE.eco;
  const [label, tone] = LABEL[v];
  const result: Result = {
    id: cs.id, decision: d, verdict: v, label, tone, note: notes.join(' '), findings: nf, called: r.called, spent: r.spent, eco,
    opened: cs.layers.filter(l => r.revealed.includes(l.id)).map(l => l.label),
  };
  s.results.push(result); s.done.push(cs.id);
  return { result, events };
}

/** Ход часов. true — смена закончилась по времени. */
export function tick(s: GameState, minutes = 1): boolean {
  if (s.phase !== 'shift') return false;
  s.min = Math.min(s.end, s.min + minutes);
  return s.min >= s.end;
}

export interface ShiftSummary { missed: number; earned: number; study: number; dayPts: number; verdict: string }

/** Конец смены: неразобранные объекты доходят до пользователей, начисляется бюджет. */
export function endShift(c: Content, s: GameState): ShiftSummary {
  let cs: Case | undefined; let guard = 0;
  while ((cs = current(c, s)) && guard++ < 50) {
    Object.assign(s.flags, cs.fx?.allow ?? {});
    s.loyalty -= SCORE.unresolvedLoyalty;
    const r = run(s, cs.id);
    s.results.push({ id: cs.id, decision: null, verdict: 'unresolved', label: LABEL.unresolved[0], tone: 'bad',
      note: cs.truth === 'attack' ? 'Объект не обработан до конца смены: атака дошла до пользователя.' : `Объект не обработан до конца смены. Лояльность −${SCORE.unresolvedLoyalty}.`,
      findings: 0, called: r.called, spent: r.spent, eco: false, opened: [] });
    s.done.push(cs.id);
  }
  const byId = new Map(c.cases.map(x => [x.id, x]));
  const missed = s.results.filter(r => byId.get(r.id)?.truth === 'attack' && (r.verdict === 'miss' || r.verdict === 'unresolved')).length;
  const study = s.results.reduce((a, r) => a + r.spent, 0);
  const dayPts = s.pts - s.dayStartPts;
  const b = c.world.budget;
  s.earned = 0;
  if (!isLastDay(c, s)) {
    s.earned = b.base + (missed === 0 ? b.bonus_no_missed : 0) + (s.loyalty >= b.bonus_loyalty.min ? b.bonus_loyalty.value : 0) + (s.warns <= b.bonus_warnings.max ? b.bonus_warnings.value : 0);
    s.budget += s.earned;
  }
  s.history.push({ day: s.day, pts: dayPts, missed, warns: s.warns });
  s.phase = isLastDay(c, s) ? 'final' : 'report';
  const verdict = missed > 0 ? 'Периметр пробит' : s.loyalty < 50 ? 'Периметр цел, бизнес в ярости' : s.warns > 2 ? 'Периметр цел, но с замечаниями' : 'Чистая смена';
  return { missed, earned: s.earned, study, dayPts, verdict };
}

/** Вечерние покупки. Возвращает false, если не хватает бюджета. */
export function buy(c: Content, s: GameState, ids: string[]): boolean {
  const ups = ids.map(id => c.world.upgrades.find(u => u.id === id)).filter(Boolean) as Content['world']['upgrades'];
  const cost = ups.reduce((a, u) => a + u.cost, 0);
  if (cost > s.budget || ups.some(u => !u.once && s.upgrades.includes(u.id))) return false;
  s.budget -= cost;
  for (const u of ups) {
    if (u.once) { if (u.effects?.escalations) s.overtime = true; }
    else s.upgrades.push(u.id);
    s.loyalty += u.effects?.loyalty ?? 0;
  }
  return true;
}

export function chainOutcome(c: Content, s: GameState) {
  return c.world.chain.outcomes.find(o => matches(o.when, s.flags, new Set(s.upgrades))) ?? null;
}

// ---------- сохранение между сменами ----------
// Сохраняется только то, что переходит из смены в смену, и делается это между сменами —
// до startDay следующей. При загрузке смена начинается заново с утра.
export interface Save { v: 1; day: number; pts: number; loyalty: number; flags: Flags; upgrades: string[]; budget: number; overtime: boolean; history: GameState['history'] }

export const toSave = (s: GameState, nextDay: number): Save => ({ v: 1, day: nextDay, pts: s.pts, loyalty: s.loyalty,
  flags: { ...s.flags }, upgrades: [...s.upgrades], budget: s.budget, overtime: s.overtime, history: [...s.history] });

export function fromSave(c: Content, save: Save): GameState {
  const s = newGame();
  Object.assign(s, { pts: save.pts, loyalty: save.loyalty, flags: { ...save.flags }, upgrades: [...save.upgrades], budget: save.budget, overtime: save.overtime, history: [...save.history] });
  startDay(c, s, save.day);
  return s;
}
