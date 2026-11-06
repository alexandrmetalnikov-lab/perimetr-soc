<script lang="ts">
  import { onMount } from 'svelte';
  import { LAYOUTS, pickLayout, rectStyle, type LayoutId } from './layouts';
  import { DEMO, QUEUE, ALERTS } from './demo';
  import { stampThunk, uiClick, startRing, stopRing, setSound } from '../lib/audio';
  import { startSnow } from '../lib/snow';

  let { onexit }: { onexit: () => void } = $props();

  type Decision = 'allow' | 'block' | 'escalate';
  const STAMP: Record<Decision, { label: string; short: string; color: string }> = {
    allow: { label: 'ПРОПУЩЕНО', short: '✓', color: 'var(--stamp-allow)' },
    block: { label: 'ЗАБЛОКИРОВАНО', short: '✕', color: 'var(--stamp-block)' },
    escalate: { label: 'ЭСКАЛИРОВАНО', short: '⇧', color: 'var(--stamp-esc)' },
  };
  const TIPS: Record<Decision, string> = { allow: 'Пропустить', block: 'Блокировать', escalate: 'Эскалировать' };

  let forced = $state<LayoutId | null>(null);
  let auto = $state<LayoutId>(pickLayout());
  let lid = $derived(forced ?? auto);
  let L = $derived(LAYOUTS[lid]);
  const base = import.meta.env.BASE_URL;

  let idx = $state(0);
  let c = $derived(DEMO[idx % DEMO.length]);
  let docState = $state<'' | 'in' | 'out'>('');
  let mark = $state<Decision | null>(null);
  let busy = false;
  let shake = $state(false);
  let ringing = $state(false);
  let drawer = $state(false);
  let hints = $state(false);
  let sound = $state(true);
  let bubble = $state<{ title: string; text: string } | null>(null);
  let slip = $state<{ text: string; good: boolean } | null>(null);
  let min = $state(16 * 60 + 42);
  let alertCount = $state(1);
  let eps = $state(1204);
  let canvas: HTMLCanvasElement;

  const clock = $derived(`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`);
  const cur = $derived(2 + (idx % DEMO.length));
  const alerts = $derived(ALERTS.slice(0, Math.min(ALERTS.length, alertCount)).slice(-7));
  // телефон «вибрирует» вырезкой из той же картинки
  const phoneBg = $derived(`background-image:url(${base}${L.bg});background-position:-${L.phone.x}cqw -${(L.phone.y / 100) * L.ratio * 100}cqw`);

  function toast(text: string, good: boolean) { slip = { text, good }; setTimeout(() => (slip = null), 2600); }

  function stamp(d: Decision) {
    if (busy) return; busy = true;
    mark = d; stampThunk();
    shake = false; requestAnimationFrame(() => (shake = true));
    const right = c.bad ? d !== 'allow' : d === 'allow';
    setTimeout(() => toast((right ? 'Верно. ' : 'Ошибка. ') + c.why, right), 250);
    setTimeout(() => {
      docState = 'out';
      setTimeout(() => {
        idx++; mark = null; docState = 'in';
        requestAnimationFrame(() => requestAnimationFrame(() => (docState = '')));
        busy = false;
      }, 480);
    }, 900);
  }

  function ring() { if (ringing) return; ringing = true; startRing(); }
  function answer() {
    const was = ringing; ringing = false; stopRing(); uiClick();
    bubble = was
      ? { title: 'Входящий · helpdesk 1100', text: '«Здравствуйте, Анна Смирнова, финансы. Я потеряла телефон, а мне прямо сейчас нужно войти…»' }
      : { title: 'Исходящий · по номеру из договора', text: 'С. Павлов, «ТехСнаб»: «Реквизиты не менялись, никаких писем мы не отправляли».' };
    setTimeout(() => (bubble = null), 5200);
  }

  onMount(() => {
    const onResize = () => (auto = pickLayout());
    addEventListener('resize', onResize);
    const t1 = setInterval(() => min++, 1000);
    const t2 = setInterval(() => { alertCount = (alertCount % (ALERTS.length + 3)) + 1; eps = 1100 + Math.floor(Math.random() * 300); }, 1400);
    const t3 = setTimeout(ring, 9000);
    const stopSnow = startSnow(canvas);
    return () => { removeEventListener('resize', onResize); clearInterval(t1); clearInterval(t2); clearTimeout(t3); stopSnow(); stopRing(); };
  });
</script>

<div class="bar">
  <button class="back" type="button" onclick={onexit}>← Меню</button>
  <div class="ctl">
    <button type="button" aria-pressed={hints} onclick={() => (hints = !hints)}>Подсветить предметы</button>
    <button type="button" aria-pressed={sound} onclick={() => { sound = !sound; setSound(sound); }}>Звук: {sound ? 'вкл' : 'выкл'}</button>
    <button type="button" onclick={ring}>Позвонить на стол</button>
    <button type="button" onclick={() => (forced = lid === 'port' ? 'land' : 'port')}>Вид: {lid === 'port' ? 'компьютер' : 'телефон'}</button>
  </div>
</div>

<div class="scene {lid}" class:shake class:hints style="aspect-ratio:{1 / L.ratio};background-image:url({base}{L.bg})">
  <canvas class="snow" bind:this={canvas} style="clip-path:{L.snow}"></canvas>
  <div class="spill"></div>

  <div class="screen" style={rectStyle(L.screenL)} aria-label="Левый монитор: очередь">
    <div class="hd"><span>Смена 1 · 02.11</span><span>SOC</span></div>
    <div class="clock">{clock}</div>
    <div class="q">
      {#each QUEUE as q, i}
        <div class:dn={i < cur} class:cur={i === cur}><span>{i + 1}. {q}</span><span>{i < cur ? 'готово' : i === cur ? 'на столе' : 'ждёт'}</span></div>
      {/each}
    </div>
  </div>
  <div class="screen" style={rectStyle(L.screenR)} aria-label="Правый монитор: поток событий">
    <div class="hd"><span>SIEM · поток событий</span><span>EPS {eps.toLocaleString('ru-RU')}</span></div>
    <div class="al">
      {#each alerts as a}<div class:crit={a[2]}><span>{a[0]}</span><span>{a[1]}</span></div>{/each}
    </div>
  </div>

  <button class="hot" type="button" style={rectStyle(L.binder)} onclick={() => { uiClick(); drawer = true; }}><span class="tip">Справочник</span></button>
  <button class="hot phone" class:ring={ringing} type="button" style={rectStyle(L.phone)} onclick={answer}>
    <span class="phonecut" style={phoneBg}></span><span class="tip">Телефон</span>
  </button>
  <div class="hot stamps" role="group" aria-label="Штампы" style={rectStyle(L.stamps)}>
    {#each Object.keys(STAMP) as k}
      {@const d = k as Decision}
      <button type="button" aria-label={TIPS[d]} onclick={() => stamp(d)}><span class="tip">{lid === 'port' ? STAMP[d].short : TIPS[d]}</span></button>
    {/each}
  </div>

  <article class="doc {docState}" style={rectStyle(L.doc)}>
    <div class="kind"><span>Объект {cur + 1} из 9</span><span>{c.kind}</span></div>
    <h2>{c.title}</h2>
    <div class="mh">{#if c.portrait}<div class="ava pic" style="background-image:url({base}assets/portraits/{c.portrait})" role="img" aria-label={c.from}></div>{:else}<div class="ava">{c.ini}</div>{/if}<div><b>{c.from}</b><small>кому: buh@sevterminal.ru · {c.time}</small></div></div>
    {#each c.body as p}<p>{p}</p>{/each}
    <p>{#each c.signature as s, i}{s}{#if i < c.signature.length - 1}<br />{/if}{/each}</p>
    <span class="att">📎 {c.att}</span>
    {#if mark}<div class="mark" style="color:{STAMP[mark].color}">{STAMP[mark].label}</div>{/if}
  </article>

  <aside class="drawer" class:open={drawer} aria-label="Справочник" aria-hidden={!drawer}>
    <button class="x" type="button" onclick={() => { uiClick(); drawer = false; }}>Закрыть</button>
    <h3>Контрагенты</h3>
    <div class="row"><b>ООО «ТехСнаб» · договор № 214/25</b><span>Домен: tehsnab.ru</span><span>Сергей Павлов, +7 495 410-22-17</span></div>
    <div class="row"><b>ООО «Логистик Плюс» · договор № 87/24</b><span>Домен: logplus.ru</span><span>Елена Кузнецова, +7 812 300-45-61</span></div>
    <h3>Регламент</h3>
    <div class="row"><span>Смена банковских реквизитов принимается только после звонка по контакту из договора.</span></div>
  </aside>

  {#if bubble}<div class="bubble"><b>{bubble.title}</b>{bubble.text}</div>{/if}
  {#if slip}<div class="slip" class:good={slip.good}>{slip.text}</div>{/if}
</div>

<style>
  .bar{display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center;justify-content:space-between;max-width:1400px;margin:0 auto 14px}
  .ctl{display:flex;gap:8px;flex-wrap:wrap}
  .bar button{font-family:var(--f-mono);font-size:12px;background:transparent;border:1px solid #33405a;color:var(--ink);padding:6px 10px}
  .bar button[aria-pressed="true"]{border-color:var(--lamp);color:var(--lamp)}

  .scene{position:relative;width:100%;max-width:1400px;margin:0 auto;container-type:inline-size;overflow:hidden;background:#0b0f18 center/cover no-repeat;user-select:none}
  .scene.port{max-width:min(100%,560px)}
  .scene.shake{animation:shake .28s}
  @keyframes shake{20%{transform:translate(.25cqw,.15cqw)}40%{transform:translate(-.2cqw,-.1cqw)}60%{transform:translate(.12cqw,.08cqw)}80%{transform:translate(-.06cqw,0)}}
  .spill{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;
    background:radial-gradient(38cqw 18cqw at 54% 48%,rgba(79,179,176,.2),transparent 70%),radial-gradient(60cqw 40cqw at 50% 50%,transparent 55%,rgba(5,8,16,.55) 100%)}
  .snow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}

  .screen{position:absolute;overflow:hidden;font-family:var(--f-mono);color:#bfe9e4;font-size:.78cqw;line-height:1.35;padding:.6cqw .8cqw;
    background:linear-gradient(180deg,rgba(18,46,52,.92),rgba(10,28,34,.95));box-shadow:0 0 2.5cqw rgba(79,179,176,.35),inset 0 0 1.2cqw rgba(0,0,0,.6)}
  .screen::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);pointer-events:none}
  .hd{display:flex;justify-content:space-between;color:#7fc7c0;border-bottom:1px solid rgba(127,199,192,.3);padding-bottom:.3cqw;margin-bottom:.35cqw;letter-spacing:.05em;text-transform:uppercase;font-size:.66cqw}
  .clock{font-family:var(--f-display);font-size:2.2cqw;color:var(--lamp);text-shadow:0 0 1cqw rgba(224,160,70,.5);line-height:1}
  .q{display:grid;gap:.15cqw;margin-top:.4cqw}
  .q div{display:flex;justify-content:space-between}
  .q .cur{color:#fff;background:rgba(79,179,176,.18)}
  .q .dn{opacity:.45;text-decoration:line-through}
  .al div{display:grid;grid-template-columns:4.2cqw minmax(0,1fr);gap:.4cqw;padding:.12cqw 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .al .crit{color:#ff8b80;animation:blink 1.1s steps(2) infinite}
  @keyframes blink{50%{opacity:.35}}

  .hot{position:absolute;background:transparent;border:0;padding:0;border-radius:.6cqw}
  .hot:hover,.hot:focus-visible,.hints .hot{box-shadow:0 0 0 .18cqw rgba(224,160,70,.75),0 0 2cqw rgba(224,160,70,.35)}
  .tip{position:absolute;left:50%;top:-.4cqw;transform:translate(-50%,-100%);white-space:nowrap;font-family:var(--f-mono);font-size:.8cqw;background:rgba(10,14,24,.88);color:var(--lamp);padding:.2cqw .5cqw;opacity:0;transition:opacity .15s;pointer-events:none}
  .hot:hover>.tip,.hot:focus-visible>.tip,.hints .tip{opacity:1}
  .stamps{display:grid;grid-template-columns:repeat(3,1fr)}
  .stamps button{background:transparent;border:0;border-radius:.4cqw;position:relative}
  .stamps button:hover,.stamps button:focus-visible{background:rgba(224,160,70,.14)}
  .stamps .tip{top:auto;bottom:-.4cqw;transform:translate(-50%,100%)}
  .stamps button:hover .tip,.stamps button:focus-visible .tip{opacity:1}
  .phone{overflow:visible}
  .phonecut{position:absolute;inset:0;background-size:100cqw auto;border-radius:.6cqw;pointer-events:none;opacity:0}
  .phone.ring .phonecut{opacity:1;animation:ring .5s infinite}
  @keyframes ring{0%,100%{transform:rotate(0)}15%{transform:rotate(-2.2deg) translateY(-.2cqw)}30%{transform:rotate(2.2deg)}45%{transform:rotate(-1.6deg)}60%{transform:rotate(1.2deg)}75%{transform:rotate(0)}}
  .phone.ring::before{content:"";position:absolute;inset:-1cqw;border-radius:50%;border:.2cqw solid rgba(224,160,70,.6);animation:pulse 1s infinite}
  @keyframes pulse{from{transform:scale(.7);opacity:1}to{transform:scale(1.25);opacity:0}}

  .doc{position:absolute;background:var(--paper);color:var(--paper-ink);font-size:clamp(8px,.92cqw,15px);padding:1.3cqw 1.6cqw;transform:rotate(-1.2deg);
    box-shadow:0 1.6cqw 3cqw rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.15);overflow:auto;background-image:linear-gradient(180deg,rgba(224,160,70,.12),transparent 40%);
    transition:transform .5s cubic-bezier(.2,.7,.2,1),opacity .5s}
  .doc.out{transform:translateX(60cqw) rotate(10deg);opacity:0}
  .doc.in{transform:translateY(-20cqw) rotate(-6deg);opacity:0}
  .kind{font-family:var(--f-mono);font-size:.85em;letter-spacing:.12em;text-transform:uppercase;color:#6a6658;display:flex;justify-content:space-between}
  .doc h2{font-family:var(--f-display);font-weight:400;font-size:1.25em;margin:.35em 0 .6em;text-wrap:balance}
  .mh{display:flex;gap:.8em;align-items:center;margin-bottom:.7em}
  .ava{width:2.6em;height:2.6em;border-radius:50%;background:#d3c8ad;display:grid;place-items:center;font-family:var(--f-mono);font-weight:600;flex:none}
  .ava.pic{width:3.4em;height:3.4em;background-color:#16223a;background-size:240% auto;background-position:66% 30%;box-shadow:0 0 0 1px rgba(0,0,0,.25)}
  .mh small{display:block;color:#6a6658}
  .doc p{margin:0 0 .6em;max-width:62ch}
  .att{display:inline-block;font-family:var(--f-mono);font-size:.9em;border:1px solid #b2aa95;padding:.2em .6em}
  .mark{position:absolute;right:7%;top:9%;font-family:var(--f-display);font-size:2.1em;padding:.15em .5em;border:.22em solid currentColor;mix-blend-mode:multiply;pointer-events:none;animation:thunk .22s ease-out forwards}
  @keyframes thunk{from{transform:rotate(-13deg) scale(1.7);opacity:0}to{transform:rotate(-13deg) scale(1);opacity:.85}}

  .drawer{position:absolute;left:0;top:0;bottom:0;width:36%;background:rgba(14,20,36,.96);border-right:1px solid var(--line);transform:translateX(-102%);transition:transform .35s cubic-bezier(.2,.7,.2,1);padding:1.4cqw 1.6cqw;font-size:clamp(8px,.95cqw,15px);overflow:auto;z-index:4}
  .drawer.open{transform:none}
  .drawer h3{font-family:var(--f-mono);font-size:.82em;letter-spacing:.12em;text-transform:uppercase;color:var(--lamp);margin:1em 0 .6em;font-weight:500}
  .row{border-bottom:1px dotted var(--line);padding:.5em 0;display:grid;gap:.1em}
  .row b{color:var(--paper)}
  .row span{color:var(--soft)}
  .x{position:absolute;right:.8cqw;top:.8cqw;background:transparent;border:1px solid #33405a;color:var(--ink);font-family:var(--f-mono);font-size:.85em;padding:.2em .6em}
  .bubble{position:absolute;right:21%;top:33%;width:30%;background:rgba(14,20,36,.95);border:1px solid var(--lamp);padding:1cqw 1.2cqw;font-size:clamp(8px,.92cqw,15px);z-index:3;box-shadow:0 1cqw 2cqw rgba(0,0,0,.5)}
  .bubble b{display:block;font-family:var(--f-mono);font-size:.8em;letter-spacing:.1em;text-transform:uppercase;color:var(--lamp);margin-bottom:.3em;font-weight:500}
  .slip{position:absolute;left:50%;top:3%;transform:translateX(-50%);background:#f1ede2;color:var(--paper-ink);font-family:var(--f-mono);font-size:clamp(8px,.9cqw,14px);padding:.8cqw 1.1cqw;border-top:.35cqw dashed var(--alarm);box-shadow:0 1cqw 2cqw rgba(0,0,0,.5);z-index:5;animation:print .35s ease-out}
  .slip.good{border-top-color:var(--ok)}
  @keyframes print{from{transform:translate(-50%,-1.5cqw);opacity:0}}

  /* вертикальный стол для телефона */
  .port .screen{font-size:1.5cqw;padding:1cqw 1.3cqw}
  .port .hd{font-size:1.25cqw}
  .port .clock{font-size:4.4cqw}
  .port .q div:nth-child(n+5){display:none}
  .port .al div{grid-template-columns:7cqw minmax(0,1fr)}
  .port .tip{font-size:2.4cqw;padding:.4cqw .9cqw}
  .port .stamps .tip{font-size:3cqw}
  .port .doc{font-size:max(10.5px,2.7cqw);padding:3cqw 3.4cqw;transform:rotate(-.8deg)}
  .port .doc.out{transform:translateX(90cqw) rotate(10deg)}
  .port .doc.in{transform:translateY(-40cqw) rotate(-6deg)}
  .port .mark{font-size:1.7em}
  .port .drawer{width:82%;font-size:max(11px,2.9cqw);padding:4cqw}
  .port .bubble{left:8%;right:8%;top:36%;width:auto;font-size:max(11px,2.9cqw);padding:2.5cqw 3cqw}
  .port .slip{font-size:max(10px,2.5cqw);padding:2cqw 2.6cqw;width:84%;text-align:center}
</style>
