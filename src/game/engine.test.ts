import { describe, it, expect } from 'vitest';
import { loadContent } from '../content';
import * as E from './engine';
import type { Decision } from '../content/types';

const C = loadContent();

function game(day = 1, init: Partial<E.GameState> = {}) {
  const s = E.newGame(); Object.assign(s, init);
  E.startDay(C, s, day); E.beginShift(s);
  return s;
}
/** Пройти смену: решения по id, остальное — первым верным решением. */
function play(s: E.GameState, plan: Record<string, Decision> = {}) {
  for (let i = 0; i < 20; i++) {
    const c = E.current(C, s); if (!c) break;
    const d = plan[c.id] ?? (Object.entries(c.outcomes).find(([, o]) => o === 'best' || o === 'ok')![0] as Decision);
    if (c.requires_call && d === 'allow') E.secondChannel(C, s);
    E.decide(C, s, d);
  }
  return E.endShift(C, s);
}

describe('смена', () => {
  it('начинается по расписанию и с полной очередью', () => {
    const s = game(1);
    expect(E.fmtMin(s.min)).toBe('09:00');
    expect(E.fmtMin(s.end)).toBe('18:00');
    expect(E.queue(C, s)).toHaveLength(9);
    expect(s.esc).toBe(4);
    expect(game(2).end).toBe(E.toMin('17:00'));
  });

  it('слой стоит минут и открывается один раз', () => {
    const s = game(1);
    expect(E.reveal(C, s, 'addr')).toBe(true);
    expect(E.reveal(C, s, 'addr')).toBe(false);
    expect(s.min).toBe(E.toMin('09:02'));
    expect(E.run(s, 'lp').spent).toBe(2);
  });

  it('песочница и TI — только в пробный день или после покупки', () => {
    const s1 = game(1); expect(E.hasTool(C, s1, 'sandbox')).toBe(true);
    const s2 = game(2); expect(E.hasTool(C, s2, 'sandbox')).toBe(false);
    expect(E.reveal(C, s2, 'nope')).toBe(false);
    const s3 = game(2, { upgrades: ['sandbox'] }); expect(E.hasTool(C, s3, 'sandbox')).toBe(true);
  });

  it('инспекция находит противоречие в любом порядке полей', () => {
    const s = game(1); E.decide(C, s, 'block'); // lp: ложная блокировка, чтобы дойти до bec
    E.secondChannel(C, s); // это уже zay
    E.decide(C, s, 'allow');
    expect(E.current(C, s)!.id).toBe('bec');
    expect(E.inspect(C, s, 'ref.ts.phone', 'bec.phone')).toEqual({ text: 'Телефон в подписи не совпадает с телефоном из договора', fresh: true });
    expect(E.inspect(C, s, 'bec.phone', 'ref.ts.phone')!.fresh).toBe(false);
    expect(E.inspect(C, s, 'bec.phone', 'bec.reply')).toBeNull();
  });
});

describe('очки и предупреждения', () => {
  it('верный пропуск без обязательного звонка — нарушение регламента', () => {
    const s = game(1);
    const r = E.decide(C, s, 'allow')!;
    expect(r.result.verdict).toBe('violation');
    expect(s.pts).toBe(E.SCORE.violation);
    expect(s.warns).toBe(1);
  });

  it('с обязательным звонком — верно и экономно', () => {
    const s = game(1);
    E.secondChannel(C, s);
    const r = E.decide(C, s, 'allow')!;
    expect(r.result.verdict).toBe('ok');
    expect(r.result.eco).toBe(true);
    expect(s.pts).toBe(E.SCORE.ok + E.SCORE.eco);
    expect(s.min).toBe(E.toMin('09:30'));
  });

  it('атака без находок: очки минус штраф за отсутствие обоснования, без бонуса «экономно»', () => {
    const s = game(1, {});
    E.secondChannel(C, s); E.decide(C, s, 'allow'); // lp
    E.reveal(C, s, 'mfa'); E.decide(C, s, 'allow'); // zay
    const before = s.pts;
    const r = E.decide(C, s, 'block')!; // bec, best
    expect(r.result.eco).toBe(false);
    expect(s.pts - before).toBe(E.SCORE.best + E.SCORE.noEvidence);
  });

  it('третье предупреждение стоит очков', () => {
    const s = game(1);
    E.decide(C, s, 'block'); E.decide(C, s, 'block'); // две ложные блокировки
    const before = s.pts;
    E.decide(C, s, 'allow'); // bec — пропущена атака, третье предупреждение
    expect(s.warns).toBe(3);
    expect(s.pts - before).toBe(E.SCORE.miss - E.SCORE.warnPenalty);
    expect(s.loyalty).toBe(100 - 2 * E.SCORE.falseBlockLoyalty);
  });

  it('эскалации кончаются', () => {
    const s = game(1);
    for (let i = 0; i < 4; i++) expect(E.decide(C, s, 'escalate')).not.toBeNull();
    expect(E.decide(C, s, 'escalate')).toBeNull();
  });
});

describe('конец смены и кампания', () => {
  it('чистая первая смена даёт полный бюджет', () => {
    const s = game(1);
    const sum = play(s);
    expect(sum.missed).toBe(0);
    expect(sum.earned).toBe(7);
    expect(s.phase).toBe('report');
  });

  it('неразобранная атака из цепочки считается пропущенной и двигает сюжет', () => {
    const s = game(2);
    s.done = ['a1', 'lp2', 'ceo'];
    E.tick(s, 600);
    const sum = E.endShift(C, s);
    expect(s.flags.chain).toBe('foothold');
    expect(s.flags.snow).toBe('missed');
    expect(sum.missed).toBe(2);
  });

  it('покупки: number matching бьёт по лояльности, переработка даёт эскалации на одну смену', () => {
    const s = game(1); play(s);
    expect(E.buy(C, s, ['nm', 'overtime'])).toBe(true);
    expect(s.loyalty).toBe(95);
    expect(s.budget).toBe(5);
    E.startDay(C, s, 2);
    expect(s.esc).toBe(6);
    expect(E.buy(C, s, ['nm'])).toBe(false);
  });

  it('утренние новости применяют последствия', () => {
    const s = game(2); play(s, { ceo: 'allow', qak: 'escalate' });
    const pts = s.pts, loy = s.loyalty;
    const news = E.startDay(C, s, 3);
    expect(news.some(n => n.text.includes('теневом форуме'))).toBe(true);
    expect(s.pts - pts).toBe(5 - 20);
    expect(s.loyalty - loy).toBe(-15);
  });

  it('полная кампания: пропуск письма → маячок → эскалация останавливает на шаге 2', () => {
    const s = game(1); play(s); E.buy(C, s, ['ti']);
    E.startDay(C, s, 2); E.beginShift(s); play(s, { qak: 'allow' });
    E.startDay(C, s, 3); E.beginShift(s);
    expect(E.queue(C, s).map(c => c.id)).toContain('beac');
    play(s, { beac: 'escalate' });
    expect(s.phase).toBe('final');
    expect(E.chainOutcome(C, s)!.text).toMatch(/шаге 2/);
    expect(s.results.map(r => r.id)).not.toContain('kerb');
  });

  it('сохранение между сменами восстанавливает утро следующей', () => {
    const s = game(1); play(s); E.buy(C, s, ['sandbox']);
    const save = E.toSave(s, 2);
    const t = E.fromSave(C, JSON.parse(JSON.stringify(save)));
    expect(t.day).toBe(2);
    expect(t.phase).toBe('morning');
    expect(t.upgrades).toEqual(['sandbox']);
    expect(t.pts).toBe(s.pts);
  });
});
