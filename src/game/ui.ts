// Общие для интерфейса игры вещи: состояние инспекции, портреты, подписи решений.
import type { Content, Decision, Person } from '../content/types';

export type Tab = 'rules' | 'staff' | 'ext' | 'acc' | 'find';

export interface Inspect {
  on: boolean;
  sel: string | null;
  flash: Record<string, 'hit' | 'miss'>;
}

export const STAMP: Record<Decision, { label: string; mark: string; short: string; color: string; sprite: string; key: string }> = {
  allow: { label: 'Пропустить', mark: 'ПРОПУЩЕНО', short: '✓', color: 'var(--stamp-allow)', sprite: 'assets/obj/obj-stamp-allow.webp', key: '1' },
  block: { label: 'Блокировать', mark: 'ЗАБЛОКИРОВАНО', short: '✕', color: 'var(--stamp-block)', sprite: 'assets/obj/obj-stamp-block.webp', key: '2' },
  escalate: { label: 'Эскалировать', mark: 'ЭСКАЛИРОВАНО', short: '⇧', color: 'var(--stamp-esc)', sprite: 'assets/obj/obj-stamp-escalate.webp', key: '3' },
};
export const DECISIONS: Decision[] = ['allow', 'block', 'escalate'];

const base = import.meta.env.BASE_URL;
export const asset = (p: string) => `${base}${p}`;

export function people(c: Content): Map<string, Person> {
  return new Map([...c.world.staff, ...c.world.external, ...c.world.team].map(p => [p.id, p]));
}
export const portraitUrl = (p?: Person) => (p?.portrait ? asset(`assets/portraits/${p.portrait}`) : null);

// Фоновый поток SIEM на правом мониторе — атмосфера, не кейсы.
export const AMBIENT: string[] = [
  'VPN вход · успешно · Москва',
  'DNS · WS-BUH-07 → updates.docflow.ru',
  'Почта · 3 письма в карантине',
  'Proxy · 248 запросов · отдел продаж',
  'AD · 4624 · svc_backup',
  'EDR · сигнатуры обновлены',
  'Firewall · 12 отклонённых · 10.0.8.0/24',
  'IdP · 41 успешный вход за 5 минут',
  'Почта · DMARC отчёт · logplus.ru',
  'Backup · задание nightly-fs01 завершено',
];
