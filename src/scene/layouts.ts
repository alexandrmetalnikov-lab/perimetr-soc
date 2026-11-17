// Координаты интерактивных предметов на сгенерированных столах, в процентах от размера картинки.
// Если стол перегенерировали — поправить здесь, остальной код не трогать.
export type Rect = { x: number; y: number; w: number; h: number };
export type LayoutId = 'land' | 'port';
export type StampId = 'allow' | 'block' | 'escalate';

export interface Layout {
  bg: string;          // файл в public/assets
  ratio: number;       // высота / ширина
  screenL: Rect;       // левый монитор: часы и очередь
  screenR: Rect;       // правый монитор: поток событий
  binder: Rect;        // папка-справочник
  phone: Rect;         // телефон
  stamps: Record<StampId, Rect>; // штампы-спрайты, стоящие в пустом лотке (рамка спрайта 2:3)
  lamp: Rect;          // красная лампа алерта (спрайт, на столе её нет)
  doc: Rect;           // где лежит документ
  snow: string;        // clip-path области окна для снега
}

export const LAYOUTS: Record<LayoutId, Layout> = {
  land: {
    bg: 'assets/bg/bg-desk-evening-empty.webp', ratio: 2 / 3,
    screenL: { x: 26.2, y: 20.2, w: 23.4, h: 23.2 },
    screenR: { x: 52.3, y: 21, w: 26.8, h: 24.4 },
    binder: { x: 0, y: 52, w: 20, h: 26.5 },
    phone: { x: 75.2, y: 37.5, w: 23.8, h: 21.5 },
    stamps: {
      allow: { x: 78.2, y: 55, w: 7.2, h: 16.2 },
      block: { x: 84.5, y: 56.4, w: 7.2, h: 16.2 },
      escalate: { x: 90.8, y: 57.8, w: 7.2, h: 16.2 },
    },
    lamp: { x: 72.6, y: 42.4, w: 5.4, h: 10.1 },
    doc: { x: 20.5, y: 45.5, w: 55, h: 53 },
    snow: 'polygon(24% 0,88% 0,88% 35%,80.5% 35%,80.5% 19%,24% 19%)',
  },
  port: {
    bg: 'assets/bg/bg-desk-evening-portrait-empty.webp', ratio: 3 / 2,
    screenL: { x: 26.5, y: 23.4, w: 25.8, h: 14 },
    screenR: { x: 55.2, y: 23.4, w: 30.4, h: 14.5 },
    binder: { x: 0, y: 43, w: 20, h: 14 },
    phone: { x: 80, y: 35.5, w: 20, h: 11.5 },
    stamps: {
      allow: { x: 77.6, y: 54.4, w: 7.5, h: 7.5 },
      block: { x: 84.7, y: 55.1, w: 7.5, h: 7.5 },
      escalate: { x: 91.8, y: 55.8, w: 7.5, h: 7.5 },
    },
    lamp: { x: 87.5, y: 24, w: 8, h: 7.5 },
    doc: { x: 3, y: 39, w: 94, h: 59 },   // на телефоне документ важнее предметов: штампы и папка — в панели снизу
    snow: 'polygon(26% 0,91% 0,91% 22.5%,26% 22.5%)',
  },
};

export const rectStyle = (r: Rect) => `left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%`;

export function pickLayout(): LayoutId {
  return innerWidth < 760 || innerWidth / innerHeight < 0.9 ? 'port' : 'land';
}
