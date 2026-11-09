import { describe, it, expect } from 'vitest';
import { loadContent, matches, byDay, parseFields, plain } from './index';

const { world, cases } = loadContent();

describe('контент', () => {
  it('загружает все смены и кейсы', () => {
    expect(world.days.map(d => d.n)).toEqual([1, 2, 3]);
    expect(cases.length).toBe(24);
    expect(cases.filter(c => c.day === 1).map(c => c.id)).toEqual(['lp', 'zay', 'bec', 'iv', 'bel', 'df', 'sm', 'koz', 'nw']);
  });

  it('у каждой атаки есть хотя бы одна улика, которую можно найти', () => {
    const worldText = JSON.stringify(world);
    for (const c of cases.filter(c => c.truth !== 'legit')) {
      const caseText = JSON.stringify(c);
      for (const [a, b] of c.evidence ?? []) for (const k of [a, b]) {
        const found = caseText.includes(`[[${k}|`) || worldText.includes(`[[${k}|`) || world.rules.concat(world.threats).some(r => r.key === k);
        expect(found, `${c.id}: ${k}`).toBe(true);
      }
    }
  });
});

describe('ветки сквозной атаки в смене 3', () => {
  const day3 = (flags: Record<string, string>, ups: string[] = []) =>
    cases.filter(c => c.day === 3 && matches(c.when, flags, new Set(ups))).map(c => c.id);

  it('пропустили письмо: маячок и Kerberoasting', () => {
    expect(day3({ chain: 'foothold' })).toEqual(['lp3', 'kzn', 'beac', 'adm', 'orl', 'kerb']);
  });
  it('эскалировали маячок: Kerberoasting не приходит', () => {
    expect(day3({ chain: 'foothold', beacon: 'escalated' })).not.toContain('kerb');
  });
  it('только заблокировали: вторая попытка', () => {
    expect(day3({ chain: 'blocked' })).toContain('retry');
  });
  it('эскалировали: цепочки нет', () => {
    expect(day3({ chain: 'contained' })).toEqual(['lp3', 'kzn', 'adm', 'orl']);
  });
  it('number matching меняет MFA-бомбинг на звонок', () => {
    expect(day3({ chain: 'contained' }, ['nm'])).toEqual(['lp3', 'kzn', 'adm', 'orl2']);
  });
});

describe('помощники', () => {
  it('byDay берёт последнее значение не позже смены', () => {
    expect(byDay({ 1: 'a', 3: 'b' }, 2)).toBe('a');
    expect(byDay({ 1: 'a', 3: 'b' }, 3)).toBe('b');
  });
  it('parseFields разбирает улики', () => {
    expect(parseFields('тел. [[x.p|+7 1]] и всё')).toEqual([{ text: 'тел. ' }, { key: 'x.p', text: '+7 1' }, { text: ' и всё' }]);
    expect(plain('a [[k|b]] c')).toBe('a b c');
  });
  it('итог цепочки: первое подходящее', () => {
    const pick = (f: Record<string, string>) => world.chain.outcomes.find(o => matches(o.when, f, new Set()))!.tone;
    expect(pick({ chain: 'contained' })).toBe('good');
    expect(pick({ chain: 'blocked', retry: 'blocked' })).toBe('mid');
    expect(pick({ chain: 'foothold', beacon: 'missed', kerb: 'missed' })).toBe('bad');
  });
});
