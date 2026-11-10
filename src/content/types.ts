// Типы контента. Формат описан в content/README.md, проверяется scripts/check-content.mjs.
// Текстовые поля могут содержать улики вида [[ключ|текст]] — их разбирает parseFields().

export type Decision = 'allow' | 'block' | 'escalate';
export type Outcome = 'best' | 'ok' | 'partial' | 'false_block' | 'miss' | 'policy';
export type Truth = 'attack' | 'legit' | 'policy';
export type Tone = 'good' | 'mid' | 'bad';
export type Flags = Record<string, string>;

export interface When {
  flags?: Flags;
  not_flags?: Flags;
  upgrade?: string;
  no_upgrade?: string;
}

export interface Layer { id: string; label: string; cost: number; needs?: string }
export interface Layered { layer?: string; text: string }

export interface Block {
  layer: string;
  at?: 'top' | 'bottom';
  note?: string;
  table?: [string, string][];
  headers?: [string, string][];
  columns?: [string, string];
}

export interface EmailSurface {
  sender?: string;
  avatar: string;
  from_name: string;
  from_addr: Layered;
  to: string;
  time: string;
  flag?: { upgrade: string; text: string };
  body: string;
  link?: { label: string; layer: string; url: string };
  signature?: string;
  quote?: string;
  attachment?: string;
}

export interface CallSurface {
  caller?: string;
  line: string;
  number: Layered;
  note?: string;
  transcript: [string, string][];
}

export interface AlertSurface { severity: string; title: string; summary: string }

export interface Case {
  id: string;
  day: number;
  order: number;
  when?: When;
  kind: 'email' | 'call' | 'alert';
  type: string;
  title: string;
  truth: Truth;
  chain?: boolean;
  outcomes: Record<Decision, Outcome>;
  requires_call?: boolean;
  par: number;
  partial_note?: string;
  loyalty_cost?: Partial<Record<Decision, number>>;
  loyalty_note?: string;
  fx?: Partial<Record<Decision, Flags>>;
  layers: Layer[];
  email?: EmailSurface;
  phone_call?: CallSurface;
  alert?: AlertSurface;
  blocks?: Block[];
  ticket?: string;
  ticket_person?: string;
  evidence?: [string, string, string][];
  call?: { label: string; person?: string; emotion?: string; text: string; finding?: string };
  key: string;
  debrief: { label?: string; name: string; text: string };
}

export interface Entry { key: string; day: number; text: string }

export interface Person {
  id: string; name: string; dept?: string; org?: string; role?: string;
  status?: Record<number, string>; phone?: string; portrait?: string;
  emotions?: Record<string, string>; // эмоция → файл портрета
}

export interface Contractor {
  id: string; day: number; name: string; contract?: string; lines: string[];
  warning?: { day: number; text: string };
}

export interface Day { n: number; date: string; dow: string; start: string; end: string; trial?: string[] }
export interface Effects { pts?: number; loyalty?: number; escalations?: number }
export interface News { day: number; when?: When; tone?: Tone; text: string; effects?: Effects }
export interface Upgrade { id: string; name: string; cost: number; desc: string; once?: boolean; effects?: Effects }

export interface World {
  rules: Entry[];
  threats: Entry[];
  escalationsPerShift: number;
  staff: Person[];
  external: Person[];
  team: Person[];
  managers: { day: number; list: string[] };
  itSupport: string;
  contractors: Contractor[];
  software: Contractor[];
  accessMatrix: { day: number; rows: { role: string; allows: string; approver: string }[] };
  days: Day[];
  news: News[];
  budget: { base: number; bonus_no_missed: number; bonus_loyalty: { min: number; value: number }; bonus_warnings: { max: number; value: number } };
  upgrades: Upgrade[];
  chain: { name: string; outcomes: { when: When; tone: Tone; text: string }[]; debrief: string };
}

export interface Content { world: World; cases: Case[] }
