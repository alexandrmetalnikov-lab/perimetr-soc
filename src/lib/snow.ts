// Снег за окном: рисуется на canvas, область окна задаётся clip-path в раскладке.
export function startSnow(canvas: HTMLCanvasElement): () => void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const cx = canvas.getContext('2d')!;
  type Flake = { x: number; y: number; r: number; v: number; w: number };
  let flakes: Flake[] = [];
  let raf = 0;
  const size = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width * devicePixelRatio; canvas.height = r.height * devicePixelRatio;
    flakes = Array.from({ length: Math.round(r.width / 7) }, () => ({
      x: Math.random(), y: Math.random() * 0.4, r: Math.random() * 1.4 + 0.4, v: Math.random() * 0.0008 + 0.0004, w: Math.random() * 0.0006,
    }));
  };
  const draw = () => {
    cx.clearRect(0, 0, canvas.width, canvas.height); cx.fillStyle = 'rgba(235,240,250,.75)';
    for (const f of flakes) {
      f.y += f.v; f.x += Math.sin(f.y * 40) * f.w;
      if (f.y > 0.4) { f.y = -0.01; f.x = Math.random(); }
      cx.beginPath(); cx.arc(f.x * canvas.width, f.y * canvas.height, f.r * devicePixelRatio, 0, Math.PI * 2); cx.fill();
    }
    raf = requestAnimationFrame(draw);
  };
  const ro = new ResizeObserver(size); ro.observe(canvas);
  size(); draw();
  return () => { cancelAnimationFrame(raf); ro.disconnect(); };
}
