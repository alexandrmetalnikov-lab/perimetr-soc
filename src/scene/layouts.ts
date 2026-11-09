// Координаты интерактивных предметов на сгенерированных столах, в процентах от размера картинки.
// Если стол перегенерировали — поправить здесь, остальной код не трогать.
export type Rect = { x: number; y: number; w: number; h: number };
export type LayoutId = 'land' | 'port';

export interface Layout {
  bg: string;          // файл в public/assets
  ratio: number;       // высота / ширина
  screenL: Rect;       // левый монитор: часы и очередь
  screenR: Rect;       // правый монитор: поток событий
  binder: Rect;        // папка-справочник
  phone: Rect;         // телефон
  stamps: Rect;        // лоток со штампами
  doc: Rect;           // где лежит документ
  snow: string;        // clip-path области окна для снега
}

export const LAYOUTS: Record<LayoutId, Layout> = {
  land: {
    bg: 'assets/bg/bg-desk-evening.webp', ratio: 2 / 3,
    screenL: { x: 26.1, y: 20.6, w: 23.5, h: 22.6 },
    screenR: { x: 52.7, y: 21.4, w: 27.1, h: 24.4 },
    binder: { x: 0, y: 52.5, w: 20.5, h: 25.5 },
    phone: { x: 80.2, y: 37, w: 18.8, h: 23 },
    stamps: { x: 77, y: 60.5, w: 22.3, h: 14.5 },
    doc: { x: 23.5, y: 48.5, w: 51, h: 49.5 },
    snow: 'polygon(24% 0,88% 0,88% 37%,80.5% 37%,80.5% 19.5%,24% 19.5%)',
  },
  port: {
    bg: 'assets/bg/bg-desk-evening-portrait.webp', ratio: 3 / 2,
    screenL: { x: 25.9, y: 23.3, w: 25.9, h: 13.9 },
    screenR: { x: 54.9, y: 23.6, w: 30.6, h: 14.1 },
    binder: { x: 0, y: 42.6, w: 20, h: 14.4 },
    phone: { x: 79, y: 35.7, w: 21, h: 11.3 },
    stamps: { x: 74.6, y: 69.2, w: 25.4, h: 14.8 },
    doc: { x: 3, y: 39, w: 94, h: 59 },   // на телефоне документ важнее предметов: штампы и папка — в панели снизу
    snow: 'polygon(27% 0,92% 0,92% 22%,27% 22%)',
  },
};

export const rectStyle = (r: Rect) => `left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%`;

export function pickLayout(): LayoutId {
  return innerWidth < 760 || innerWidth / innerHeight < 0.9 ? 'port' : 'land';
}
