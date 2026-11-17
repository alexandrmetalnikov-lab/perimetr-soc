// Координаты интерактивных предметов на сгенерированных столах, в процентах от размера картинки.
// Если стол перегенерировали — поправить здесь, остальной код не трогать.
export type Rect = { x: number; y: number; w: number; h: number };
export type LayoutId = 'land' | 'port';
export type StampId = 'allow' | 'block' | 'escalate';
export type Pt = [number, number];

export interface Layout {
  bg: string;          // файл в public/assets
  ratio: number;       // высота / ширина
  screenL: Rect;       // левый монитор: часы и очередь
  screenR: Rect;       // правый монитор: поток событий
  binder: Rect;        // папка-справочник
  phone: Rect;         // телефон
  stamps: Record<StampId, Rect>; // штампы-спрайты в пустом лотке (рамка спрайта 2:3)
  trayFront: Pt[];     // контур передней и боковой стенок лотка: их кладут поверх штампов, чтобы те стояли внутри
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
      allow: { x: 78.4, y: 57.1, w: 5.6, h: 12.6 },
      block: { x: 83.8, y: 58.9, w: 5.6, h: 12.6 },
      escalate: { x: 89.2, y: 60.8, w: 5.6, h: 12.6 },
    },
    trayFront: [[77.08, 66.28], [95.16, 72.49], [99.28, 68.46], [99.09, 73.96], [95.01, 78.22], [77.08, 71.48]],
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
      allow: { x: 79.1, y: 57.2, w: 5.4, h: 5.4 },
      block: { x: 84.4, y: 58.1, w: 5.4, h: 5.4 },
      escalate: { x: 89.7, y: 59, w: 5.4, h: 5.4 },
    },
    trayFront: [[77.21, 60.59], [94.73, 63.63], [100, 61.7], [100, 65.1], [94.73, 66.84], [77.21, 63.8]],
    lamp: { x: 87.5, y: 24, w: 8, h: 7.5 },
    doc: { x: 3, y: 39, w: 94, h: 59 },   // на телефоне документ важнее предметов: штампы и папка — в панели снизу
    snow: 'polygon(26% 0,91% 0,91% 22.5%,26% 22.5%)',
  },
};

/** Рамка вокруг контура и сам контур (clip-path в процентах этой рамки). */
export function cutBox(pts: Pt[]) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const r: Rect = { x: Math.min(...xs), y: Math.min(...ys), w: 0, h: 0 };
  r.w = Math.max(...xs) - r.x; r.h = Math.max(...ys) - r.y;
  const clip = `polygon(${pts.map(([x, y]) => `${(((x - r.x) / r.w) * 100).toFixed(2)}% ${(((y - r.y) / r.h) * 100).toFixed(2)}%`).join(',')})`;
  return { r, clip };
}

export const rectStyle = (r: Rect) => `left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%`;

export function pickLayout(): LayoutId {
  return innerWidth < 760 || innerWidth / innerHeight < 0.9 ? 'port' : 'land';
}
