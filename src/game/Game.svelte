<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { loadContent, plain } from '../content';
  import type { Decision } from '../content/types';
  import * as E from './engine';
  import CaseDoc from './CaseDoc.svelte';
  import Binder from './Binder.svelte';
  import Rich from './Rich.svelte';
  import { LAYOUTS, pickLayout, rectStyle, type LayoutId } from '../scene/layouts';
  import { stampThunk, uiClick, startRing, stopRing, setSound, alarm } from '../lib/audio';
  import { startSnow } from '../lib/snow';
  import { AMBIENT, DECISIONS, STAMP, asset, people, portraitUrl, type Inspect, type Tab } from './ui';

  let { onexit }: { onexit: () => void } = $props();

  const C = loadContent();
  const P = people(C);
  const byId = new Map(C.cases.map(c => [c.id, c]));
  const SAVE_KEY = 'perimetr-soc.save.v1';
  const EMPTY: E.CaseRun = { revealed: [], spent: 0, findings: [], called: false };

  // ---------- состояние ----------
  function fresh() { const g = E.newGame(); E.startDay(C, g, 1); return g; }
  let s = $state(fresh());
  let save = $state<E.Save | null>(null);

  const ins = $state<Inspect>({ on: false, sel: null, flash: {} });
  setContext('inspect', ins);

  let forced = $state<LayoutId | null>(null);
  let auto = $state<LayoutId>(pickLayout());
  const lid = $derived(forced ?? auto);
  const L = $derived(LAYOUTS[lid]);

  let paused = $state(false);
  let busy = $state(false);
  let sound = $state(true);
  let drawer = $state(false);
  let tab = $state<Tab>('rules');
  let answered = $state<string[]>([]);
  let mark = $state<Decision | null>(null);
  let drop = $state<Decision | null>(null);
  let docState = $state<'' | 'in' | 'out'>('');
  let shake = $state(false);
  let bubble = $state<{ title: string; text: string; portrait: string | null } | null>(null);
  let slips = $state<{ id: number; kind: E.GameEvent['kind']; title: string; text: string }[]>([]);
  let summary = $state<E.ShiftSummary | null>(null);
  let picks = $state<string[]>([]);
  let ambient = $state(3);
  let canvas: HTMLCanvasElement;

  const q = $derived(E.queue(C, s));
  const cur = $derived(E.current(C, s));
  const r = $derived(cur ? (s.runs[cur.id] ?? EMPTY) : EMPTY);
  const ringing = $derived(s.phase === 'shift' && !busy && cur?.kind === 'call' && !answered.includes(cur.id));
  const day = $derived(C.world.days.find(d => d.n === s.day)!);
  const findings = $derived(r.findings);
  const tools = $derived({ sandbox: E.hasTool(C, s, 'sandbox'), ti: E.hasTool(C, s, 'ti'), nm: s.upgrades.includes('nm'), trial: (day.trial ?? []).length > 0 });
  const phoneBg = $derived(`background-image:url(${asset(L.bg)});background-position:-${L.phone.x}cqw -${(L.phone.y / 100) * L.ratio * 100}cqw`);
  const spent = $derived(picks.reduce((a, id) => a + (C.world.upgrades.find(u => u.id === id)?.cost ?? 0), 0));

  $effect(() => { if (ringing) startRing(); else stopRing(); });

  // Красная лампа: объект с высокой важностью на столе. Зависит только от важности, а не от того, атака это или нет.
  const alert = $derived(s.phase === 'shift' && !busy && cur?.alert?.severity === 'Высокий');
  let alarmedFor = '';
  $effect(() => { if (alert && cur && alarmedFor !== cur.id) { alarmedFor = cur.id; alarm(); } });

  // ---------- сообщения ----------
  let slipId = 0;
  function slip(kind: E.GameEvent['kind'], title: string, text: string) {
    const id = ++slipId;
    slips = [{ id, kind, title, text }, ...slips].slice(0, 3);
    setTimeout(() => (slips = slips.filter(x => x.id !== id)), kind === 'warn' ? 5200 : 2800);
  }

  // ---------- действия ----------
  function reveal(id: string) { if (!busy && E.reveal(C, s, id)) { uiClick(); checkTime(); } }

  function answer() { if (cur && !answered.includes(cur.id)) { answered = [...answered, cur.id]; uiClick(); } }

  function phone() {
    if (busy || s.phase !== 'shift' || !cur) return;
    if (ringing) return answer();
    const call = E.secondChannel(C, s);
    if (!call) return;
    uiClick();
    bubble = { title: call.label, text: call.text, portrait: portraitUrl(call.person ? P.get(call.person) : undefined) };
    setTimeout(() => (bubble = null), 6000);
    checkTime();
  }

  function stamp(d: Decision) {
    if (busy || s.phase !== 'shift' || !cur || ringing) return;
    if (d === 'escalate' && s.esc <= 0) { slip('info', 'Эскалаций не осталось', 'Вторая линия больше не принимает эскалации в эту смену.'); return; }
    busy = true; ins.on = false; ins.sel = null; drop = d;
    setTimeout(() => { mark = d; stampThunk(); shake = false; requestAnimationFrame(() => (shake = true)); }, 330);
    setTimeout(() => { drop = null; docState = 'out'; }, 950);
    setTimeout(() => {
      const res = E.decide(C, s, d);
      for (const ev of res?.events ?? []) slip(ev.kind, ev.title, ev.text);
      mark = null; docState = 'in';
      requestAnimationFrame(() => requestAnimationFrame(() => (docState = '')));
      busy = false;
      if (!E.current(C, s)) finish();
    }, 1450);
  }

  function toggleInspect() { if (s.phase !== 'shift' || busy) return; ins.on = !ins.on; ins.sel = null; }

  function onFieldPick(target: EventTarget | null, ev: Event) {
    if (!ins.on || s.phase !== 'shift') return;
    const f = (target as HTMLElement | null)?.closest?.('.f') as HTMLElement | null;
    if (!f?.dataset.k) return;
    ev.preventDefault();
    const k = f.dataset.k;
    if (!ins.sel) { ins.sel = k; return; }
    if (ins.sel === k) { ins.sel = null; return; }
    const a = ins.sel; ins.sel = null;
    const res = E.inspect(C, s, a, k);
    const kind = res ? 'hit' : 'miss';
    ins.flash = { ...ins.flash, [a]: kind, [k]: kind };
    setTimeout(() => { const f2 = { ...ins.flash }; delete f2[a]; delete f2[k]; ins.flash = f2; }, 900);
    if (res) slip('good', res.fresh ? 'Находка записана' : 'Уже в находках', res.text);
    else slip('info', 'Противоречие не найдено', 'Эти поля друг другу не противоречат.');
  }

  function checkTime() { if (s.phase === 'shift' && s.min >= s.end) finish(); }

  function finish() {
    stopRing(); ins.on = false; ins.sel = null; drawer = false; busy = false; bubble = null;
    summary = E.endShift(C, s); picks = [];
    if (s.phase === 'final') { try { localStorage.removeItem(SAVE_KEY); } catch { /* недоступно */ } }
  }

  function togglePick(id: string) {
    const u = C.world.upgrades.find(x => x.id === id)!;
    if (picks.includes(id)) picks = picks.filter(x => x !== id);
    else if (s.budget - spent >= u.cost) picks = [...picks, id];
  }

  function nextDay() {
    E.buy(C, s, picks);
    const next = s.day + 1;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(E.toSave(s, next))); } catch { /* недоступно */ }
    answered = []; summary = null;
    E.startDay(C, s, next);
  }

  function begin() { E.beginShift(s); docState = 'in'; requestAnimationFrame(() => requestAnimationFrame(() => (docState = ''))); }

  function restart() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* недоступно */ }
    save = null; summary = null; answered = [];
    s = fresh();
  }

  function resume() {
    if (!save) return;
    s = E.fromSave(C, save); answered = [];
  }

  // ---------- часы, клавиатура, раскладка ----------
  onMount(() => {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const v = JSON.parse(raw); if (v?.v === 1 && v.day > 1) save = v; } } catch { /* недоступно */ }
    const onResize = () => (auto = pickLayout());
    addEventListener('resize', onResize);
    const t = setInterval(() => {
      if (s.phase === 'shift' && !paused && !busy) { if (E.tick(s)) finish(); }
      ambient = (ambient % (AMBIENT.length + 4)) + 1;
    }, 1000);
    const onKey = (e: KeyboardEvent) => {
      if (s.phase !== 'shift' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.classList?.contains('f') && (e.key === 'Enter' || e.key === ' ')) { onFieldPick(t, e); return; }
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      const d = DECISIONS.find(x => STAMP[x].key === e.key);
      if (d) stamp(d);
      else if (e.key === 'i' || e.key === 'ш') toggleInspect();
      else if (e.key === 'b' || e.key === 'и') drawer = !drawer;
      else if (e.key === 'c' || e.key === 'с') phone();
      else if (e.key === 'p' || e.key === 'з') paused = !paused;
      else if (e.key === 'Escape') { if (ins.on) ins.on = false; else drawer = false; }
    };
    addEventListener('keydown', onKey);
    const stopSnow = startSnow(canvas);
    return () => { removeEventListener('resize', onResize); removeEventListener('keydown', onKey); clearInterval(t); stopSnow(); stopRing(); };
  });

  const ambientLines = $derived(AMBIENT.slice(0, Math.min(AMBIENT.length, ambient)).slice(-6));
  const shiftNo = $derived(s.day);
  const daysTotal = C.world.days.length;
  const DN: Record<Decision, string> = { allow: 'Пропущено', block: 'Заблокировано', escalate: 'Эскалировано' };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="game {lid}" class:inspecting={ins.on} onclick={e => onFieldPick(e.target, e)}>
  <header class="hud">
    <div class="brand"><button class="back" type="button" onclick={onexit} title="В меню">←</button><b>ПЕРИМЕТР</b>
      <span>Смена {shiftNo} из {daysTotal} · {day.date}, {day.dow}</span></div>
    <div class="meters">
      <div class="m clock"><small>Время</small><b>{E.fmtMin(s.min)}</b></div>
      <div class="m"><small>Объекты</small><b>{s.done.length} / {q.length}</b></div>
      <div class="m"><small>Предупр.</small><b class:warn={s.warns > 2}>{s.warns}</b></div>
      <div class="m"><small>Эскалации</small><b>{s.esc}</b></div>
      <div class="m"><small>Очки</small><b>{s.pts}</b></div>
      <div class="m loy"><small>Лояльность</small><b>{s.loyalty}</b><i class="bar"><i style="width:{Math.max(0, Math.min(100, s.loyalty))}%;background:{s.loyalty > 60 ? 'var(--ok)' : s.loyalty > 30 ? 'var(--stamp-esc)' : 'var(--alarm)'}"></i></i></div>
    </div>
    <div class="ctl">
      <button type="button" aria-pressed={paused} onclick={() => (paused = !paused)}>{paused ? '▶ Дальше' : '❚❚ Пауза'}</button>
      <button type="button" aria-pressed={!sound} onclick={() => { sound = !sound; setSound(sound); }}>{sound ? '🔊' : '🔇'}</button>
      <button type="button" onclick={() => (forced = lid === 'port' ? 'land' : 'port')} title="Сменить раскладку">{lid === 'port' ? '🖥' : '📱'}</button>
    </div>
  </header>

  <div class="scene" class:shake style="aspect-ratio:{1 / L.ratio};background-image:url({asset(L.bg)})">
    <canvas class="snow" bind:this={canvas} style="clip-path:{L.snow}"></canvas>
    <div class="spill"></div>

    <div class="screen" style={rectStyle(L.screenL)} aria-hidden="true">
      <div class="hd"><span>Смена {shiftNo} · {day.date}</span><span>SOC</span></div>
      <div class="sclock">{E.fmtMin(s.min)}</div>
      <div class="q">
        {#each q as c, i}
          <div class:dn={s.done.includes(c.id)} class:cur={c === cur}><span>{i + 1}. {c.type}</span><span>{s.done.includes(c.id) ? 'готово' : c === cur ? 'на столе' : 'ждёт'}</span></div>
        {/each}
      </div>
    </div>
    <div class="screen" style={rectStyle(L.screenR)} aria-hidden="true">
      <div class="hd"><span>SIEM · поток событий</span><span>{paused ? 'ПАУЗА' : 'LIVE'}</span></div>
      <div class="al">
        {#if cur && s.phase === 'shift'}<div class="crit"><span>{E.fmtMin(s.min)}</span><span>{cur.type} · {plain(cur.title)}</span></div>{/if}
        {#each ambientLines as a, i}<div><span>{E.fmtMin(Math.max(0, s.min - i * 3 - 1))}</span><span>{a}</span></div>{/each}
      </div>
    </div>

    <div class="lamp" class:on={alert} style={rectStyle(L.lamp)} aria-hidden="true">
      <img class="off" src={asset('assets/obj/obj-lamp-off.webp')} alt="" />
      <img class="lit" src={asset('assets/obj/obj-lamp-on.webp')} alt="" />
    </div>
    {#if alert}<div class="redspill" style="--lx:{L.lamp.x + L.lamp.w / 2}%;--ly:{L.lamp.y + L.lamp.h / 2}%" aria-hidden="true"></div>{/if}

    <button class="hot binder" type="button" style={rectStyle(L.binder)} onclick={() => { uiClick(); drawer = !drawer; }} aria-label="Справочник"><span class="tip">Справочник · B</span></button>
    <button class="hot phone" class:ring={ringing} type="button" style={rectStyle(L.phone)} onclick={phone} aria-label="Телефон">
      <span class="phonecut" style={phoneBg}></span><span class="tip">{ringing ? 'Снять трубку' : 'Проверить · C'}</span>
    </button>
    <div class="hot stamps" role="group" aria-label="Штампы" style={rectStyle(L.stamps)}>
      {#each DECISIONS as d}<button type="button" aria-label={STAMP[d].label} onclick={() => stamp(d)}><span class="tip">{STAMP[d].label} · {STAMP[d].key}</span></button>{/each}
    </div>

    {#if cur && s.phase === 'shift'}
      <article class="doc {docState}" style={rectStyle(L.doc)}>
        <CaseDoc c={cur} {r} index={q.indexOf(cur) + 1} total={q.length} upgrades={s.upgrades} people={P}
          answered={answered.includes(cur.id)} {mark} canUse={t => E.hasTool(C, s, t)} onreveal={reveal} onanswer={answer} />
      </article>
    {/if}
    {#if drop}<img class="stampspr" src={asset(STAMP[drop].sprite)} alt="" style="left:{L.doc.x + L.doc.w * 0.62}%;top:{L.doc.y - 4}%" />{/if}

    <aside class="drawer" class:open={drawer} aria-label="Справочник" aria-hidden={!drawer}>
      <Binder content={C} day={s.day} bind:tab findings={findings} esc={s.esc} {tools} onclose={() => (drawer = false)} />
    </aside>

    {#if bubble}
      <div class="bubble">
        {#if bubble.portrait}<div class="bava" style="background-image:url({bubble.portrait})"></div>{/if}
        <div><b>{bubble.title}</b>{bubble.text}</div>
      </div>
    {/if}
    {#if paused && s.phase === 'shift'}<button class="pausecover" type="button" onclick={() => (paused = false)}>Пауза · нажмите, чтобы продолжить</button>{/if}
  </div>

  <nav class="actions" aria-label="Действия">
    <div class="tools">
      <button class="tool" type="button" aria-pressed={ins.on} onclick={e => { e.stopPropagation(); toggleInspect(); }} disabled={s.phase !== 'shift'}>🔍 Инспекция</button>
      <button class="tool" type="button" aria-pressed={drawer} onclick={e => { e.stopPropagation(); drawer = !drawer; }}>📁 Справочник{findings.length ? ` · ${findings.length}` : ''}</button>
      <button class="tool" type="button" onclick={phone} disabled={s.phase !== 'shift' || !cur || (!ringing && (!cur.call || r.called))}>
        ☎ {ringing ? 'Снять трубку' : cur?.call ? (r.called ? 'Проверено' : `${cur.call.label} · 30 мин`) : 'Проверка недоступна'}</button>
    </div>
    <div class="stampsbar">
      {#each DECISIONS as d}
        <button class="sbtn s-{d}" type="button" onclick={() => stamp(d)} disabled={s.phase !== 'shift' || busy || ringing || (d === 'escalate' && s.esc <= 0)}>
          {STAMP[d].label.toUpperCase()}{#if d === 'escalate'}<small>осталось {s.esc}</small>{/if}</button>
      {/each}
    </div>
  </nav>

  <div class="slips" aria-live="polite">
    {#each slips as x (x.id)}<div class="slip {x.kind}"><b>{x.title}</b>{x.text}</div>{/each}
  </div>

  <!-- ---------- оверлеи ---------- -->
  {#if s.phase === 'intro'}
    <div class="ov"><div class="sheet">
      <div class="sub">Приказ о заступлении на дежурство</div>
      <h2>Добро пожаловать на периметр</h2>
      <p>Вы дежурный аналитик первой линии SOC в компании «Северный терминал». Впереди три смены. К вам приходят письма, логи доступа, звонки в helpdesk, заявки и алерты. По каждому объекту нужно принять решение.</p>
      <p>Половина того, что выглядит подозрительно, окажется легитимным. Блокировать всё подряд не получится: бизнес это заметит. А пропущенное сегодня может вернуться через день.</p>
      <ol class="how">
        <li><b>Справочник</b> в папке на столе: регламенты, угрозы, сотрудники, контрагенты. Каждое утро бюллетень пополняется.</li>
        <li>Объект виден так, как его видит сотрудник. Кнопки <b>«Изучить»</b> раскрывают адрес, заголовки, журналы, песочницу и стоят минут смены. Верное решение без лишнего изучения даёт бонус.</li>
        <li><b>Инспекция</b>: кликните по двум полям, которые противоречат друг другу, в документе или справочнике. Находка обосновывает решение.</li>
        <li><b>Телефон</b>: проверка по второму каналу, 30 минут. Некоторые регламенты требуют её обязательно. Входящий звонок нужно снять.</li>
        <li><b>Штампы</b>: пропустить, заблокировать или эскалировать на вторую линию. Эскалаций всего 4 за смену.</li>
        <li>Вечером — <b>бюджет отдела</b>: купленные инструменты меняют следующие смены.</li>
      </ol>
      <p class="keys">Клавиши: 1, 2, 3 — штампы · I — инспекция · B — справочник · C — телефон · P — пауза</p>
      <div class="btns">
        <button class="go" type="button" onclick={begin}>Заступить на смену</button>
        {#if save}<button class="go ghost" type="button" onclick={resume}>Продолжить со смены {save.day}</button>{/if}
      </div>
    </div></div>
  {:else if s.phase === 'morning'}
    <div class="ov"><div class="sheet">
      <div class="sub">Утро · {day.date}, {day.dow} · смена {s.day} из {daysTotal}</div>
      <h2>Бюллетень на {day.date}</h2>
      {#if s.news.length}<h3>Новости</h3><ul class="news">{#each s.news as n}<li class={n.tone ?? ''}>{n.text}</li>{/each}</ul>{/if}
      {#if C.world.rules.some(x => x.day === s.day)}<h3>Новые регламенты</h3><ul class="news">{#each C.world.rules.filter(x => x.day === s.day) as x}<li>{x.text}</li>{/each}</ul>{/if}
      {#if C.world.threats.some(x => x.day === s.day)}<h3>Новые угрозы</h3><ul class="news">{#each C.world.threats.filter(x => x.day === s.day) as x}<li>{x.text}</li>{/each}</ul>{/if}
      <p class="meta2">Смена с {day.start} до {day.end} · эскалаций: {s.escMax}</p>
      <button class="go" type="button" onclick={begin}>Заступить на смену</button>
    </div></div>
  {:else if (s.phase === 'report' || s.phase === 'final') && summary}
    <div class="ov"><div class="sheet wide">
      <div class="sub">Отчёт о смене · {day.date} · {E.fmtMin(s.min)}</div>
      <h2>{summary.verdict}</h2>
      <div class="totals">
        <div><small>Очки за смену</small><b>{summary.dayPts > 0 ? '+' : ''}{summary.dayPts}</b></div>
        <div><small>Пропущено атак</small><b>{summary.missed}</b></div>
        <div><small>Предупреждения</small><b>{s.warns}</b></div>
        <div><small>Лояльность</small><b>{s.loyalty}</b></div>
        <div><small>На изучение</small><b>{summary.study} мин</b></div>
      </div>
      {#if s.phase === 'report'}<button class="jump" type="button" onclick={() => document.getElementById('evening')?.scrollIntoView({ behavior: 'smooth' })}>К вечернему бюджету ↓</button>{/if}
      <div class="rep">
        {#each s.results as res}
          {@const c = byId.get(res.id)!}
          <article>
            <header><h4>{c.type} · {plain(c.title)}</h4><span class="chip {res.tone}">{res.label}</span></header>
            <div class="meta">Решение: {res.decision ? DN[res.decision] : 'нет'} · находок: {res.findings}{res.called ? ' · был звонок' : ''} · {c.truth === 'attack' ? 'атака' : c.truth === 'policy' ? 'запрещено регламентом' : 'легитимный объект'}</div>
            <div class="meta">Изучение: {res.spent} мин{res.opened.length ? ' · ' + res.opened.join(', ') : ' · ничего не раскрыто'}{#if res.eco} · <b>экономно, +3</b>{/if}</div>
            {#if res.note}<div>{res.note}</div>{/if}
            <div class="key"><b>Где была разгадка.</b> {c.key}</div>
            <div class="src"><b>{c.debrief.label ?? 'Основано на реальном инциденте'}</b><br /><strong>{c.debrief.name}.</strong> {c.debrief.text}</div>
          </article>
        {/each}
      </div>

      {#if s.phase === 'report'}
        <section class="evening" id="evening">
          <h3>Вечер · бюджет отдела</h3>
          <p>За смену отделу выделено <b>{summary.earned} млн ₽</b>: базовые {C.world.budget.base}, +{C.world.budget.bonus_no_missed} без пропущенных атак, +{C.world.budget.bonus_loyalty.value} при лояльности от {C.world.budget.bonus_loyalty.min}, +{C.world.budget.bonus_warnings.value} если предупреждений не больше {C.world.budget.bonus_warnings.max}.{#if s.budget > summary.earned} Остаток с прошлого раза: {s.budget - summary.earned} млн ₽.{/if}</p>
          <div class="ups">
            {#each C.world.upgrades as u}
              {@const owned = !u.once && s.upgrades.includes(u.id)}
              {@const on = picks.includes(u.id)}
              <button type="button" class="up" class:on disabled={owned || (!on && s.budget - spent < u.cost)} aria-pressed={on} onclick={() => togglePick(u.id)}>
                <span class="upn">{u.name}</span><span class="upc">{owned ? 'куплено' : `${u.cost} млн ₽`}</span><span class="upd">{u.desc}</span>
              </button>
            {/each}
          </div>
          <p class="meta2">Осталось: {s.budget - spent} млн ₽. Неистраченное переходит на следующий вечер.</p>
          <button class="go" type="button" onclick={nextDay}>Утро следующей смены</button>
        </section>
      {:else}
        {@const ch = E.chainOutcome(C, s)}
        <section class="final">
          <h3>Итоги трёх смен</h3>
          <div class="totals">
            <div><small>Очки</small><b>{s.pts}</b></div>
            <div><small>Пропущено атак</small><b>{s.history.reduce((a, h) => a + h.missed, 0)}</b></div>
            <div><small>Лояльность</small><b>{s.loyalty}</b></div>
            <div><small>Куплено</small><b>{s.upgrades.length}</b></div>
          </div>
          {#if ch}
            <div class="chainbox {ch.tone}"><div class="ltag">{C.world.chain.name}</div><b>{ch.text}</b><p>{C.world.chain.debrief}</p></div>
          {/if}
          <p>Это конец прототипа. Дальше по плану: DNS-логи и песочница, линия инсайдера, регуляторные часы НКЦКИ и РКН, пулл-реквесты и финал недели.</p>
          <div class="btns"><button class="go" type="button" onclick={restart}>Начать заново</button><button class="go ghost" type="button" onclick={onexit}>В меню</button></div>
        </section>
      {/if}
    </div></div>
  {/if}
</div>

<style>
  .game{max-width:1400px;margin:0 auto;display:grid;gap:10px}
  .hud{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;justify-content:space-between}
  .brand{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
  .brand b{font-family:var(--f-display);font-weight:400;font-size:17px;color:var(--paper);letter-spacing:.04em}
  .brand span{font-family:var(--f-mono);font-size:11px;color:var(--soft);letter-spacing:.06em;text-transform:uppercase}
  .back{background:transparent;border:1px solid var(--line);color:var(--ink);padding:2px 8px}
  .meters{display:flex;flex-wrap:wrap;gap:6px 16px;font-family:var(--f-mono);font-variant-numeric:tabular-nums}
  .m{display:grid}
  .m small{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft)}
  .m b{font-size:14px;color:var(--paper);font-weight:600}
  .m b.warn{color:#e0675b}
  .clock b{font-family:var(--f-display);font-weight:400;font-size:18px;color:var(--lamp)}
  .bar{display:block;width:80px;height:5px;background:var(--night-2);border:1px solid var(--line);margin-top:3px}
  .bar i{display:block;height:100%;transition:width .4s}
  .ctl{display:flex;gap:6px}
  .ctl button{font-family:var(--f-mono);font-size:12px;background:transparent;border:1px solid var(--line);color:var(--ink);padding:5px 9px}
  .ctl button[aria-pressed="true"]{border-color:var(--lamp);color:var(--lamp)}

  /* сцена вписывается в экран по высоте: шапка и панель действий всегда видны */
  .scene{position:relative;width:100%;max-width:min(100%,calc((100dvh - 150px) * 1.5));margin:0 auto;container-type:inline-size;overflow:hidden;background:#0b0f18 center/cover no-repeat;user-select:none}
  .port .scene{max-width:min(100%,560px);margin:0 auto}
  .scene.shake{animation:shake .28s}
  @keyframes shake{20%{transform:translate(.25cqw,.15cqw)}40%{transform:translate(-.2cqw,-.1cqw)}60%{transform:translate(.12cqw,.08cqw)}80%{transform:translate(-.06cqw,0)}}
  .spill{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;background:radial-gradient(38cqw 18cqw at 54% 40%,rgba(79,179,176,.18),transparent 70%),radial-gradient(60cqw 40cqw at 50% 50%,transparent 55%,rgba(5,8,16,.5) 100%)}
  .snow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}

  .screen{position:absolute;overflow:hidden;font-family:var(--f-mono);color:#bfe9e4;font-size:.74cqw;line-height:1.35;padding:.55cqw .75cqw;
    background:linear-gradient(180deg,rgba(18,46,52,.92),rgba(10,28,34,.95));box-shadow:0 0 2.5cqw rgba(79,179,176,.35),inset 0 0 1.2cqw rgba(0,0,0,.6)}
  .screen::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);pointer-events:none}
  .hd{display:flex;justify-content:space-between;color:#7fc7c0;border-bottom:1px solid rgba(127,199,192,.3);padding-bottom:.3cqw;margin-bottom:.3cqw;letter-spacing:.05em;text-transform:uppercase;font-size:.62cqw}
  .sclock{font-family:var(--f-display);font-size:2cqw;color:var(--lamp);text-shadow:0 0 1cqw rgba(224,160,70,.5);line-height:1}
  .q{display:grid;gap:.1cqw;margin-top:.35cqw}
  .q div{display:flex;justify-content:space-between;gap:.5cqw}
  .q .cur{color:#fff;background:rgba(79,179,176,.2)}
  .q .dn{opacity:.45;text-decoration:line-through}
  .al div{display:grid;grid-template-columns:3.6cqw minmax(0,1fr);gap:.4cqw;padding:.1cqw 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .al div span:last-child{overflow:hidden;text-overflow:ellipsis}
  .al .crit{color:#ff8b80;animation:blink 1.1s steps(2) infinite}
  @keyframes blink{50%{opacity:.4}}

  .hot{position:absolute;background:transparent;border:0;padding:0;border-radius:.6cqw}
  .hot:hover,.hot:focus-visible{box-shadow:0 0 0 .18cqw rgba(224,160,70,.75),0 0 2cqw rgba(224,160,70,.35)}
  .tip{position:absolute;left:50%;top:-.4cqw;transform:translate(-50%,-100%);white-space:nowrap;font-family:var(--f-mono);font-size:.8cqw;background:rgba(10,14,24,.9);color:var(--lamp);padding:.2cqw .5cqw;opacity:0;transition:opacity .15s;pointer-events:none;z-index:3}
  .hot:hover>.tip,.hot:focus-visible>.tip,.stamps button:hover .tip,.stamps button:focus-visible .tip{opacity:1}
  .stamps{display:grid;grid-template-columns:repeat(3,1fr)}
  .stamps button{background:transparent;border:0;border-radius:.4cqw;position:relative}
  .stamps button:hover,.stamps button:focus-visible{background:rgba(224,160,70,.14)}
  .stamps .tip{top:auto;bottom:-.4cqw;transform:translate(-50%,100%)}
  .phone{overflow:visible}
  .lamp{position:absolute;pointer-events:none;filter:drop-shadow(0 .5cqw .6cqw rgba(0,0,0,.6))}
  .lamp img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;max-width:100%}
  .lamp .lit{opacity:0}
  .lamp.on .lit{animation:lampblink 1s steps(1) infinite}
  .lamp.on{filter:drop-shadow(0 0 1.6cqw rgba(255,40,30,.75))}
  @keyframes lampblink{0%{opacity:1}55%{opacity:0}}
  .redspill{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;z-index:0;
    background:radial-gradient(30cqw 22cqw at var(--lx,76%) var(--ly,44%),rgba(255,30,20,.22),transparent 70%);animation:spill 1s steps(1) infinite}
  @keyframes spill{55%{opacity:0}}
  .phonecut{position:absolute;inset:0;background-size:100cqw auto;border-radius:.6cqw;pointer-events:none;opacity:0}
  .phone.ring .phonecut{opacity:1;animation:ring .5s infinite}
  @keyframes ring{0%,100%{transform:rotate(0)}15%{transform:rotate(-2.2deg) translateY(-.2cqw)}30%{transform:rotate(2.2deg)}45%{transform:rotate(-1.6deg)}60%{transform:rotate(1.2deg)}75%{transform:rotate(0)}}
  .phone.ring::before{content:"";position:absolute;inset:-1cqw;border-radius:50%;border:.2cqw solid rgba(224,160,70,.6);animation:pulse 1s infinite}
  @keyframes pulse{from{transform:scale(.7);opacity:1}to{transform:scale(1.25);opacity:0}}

  .doc{position:absolute;background:var(--paper);color:var(--paper-ink);font-size:clamp(9px,.9cqw,15px);line-height:1.45;padding:1.2cqw 1.5cqw;transform:rotate(-.8deg);
    box-shadow:0 1.6cqw 3cqw rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.15);overflow:auto;overscroll-behavior:contain;background-image:linear-gradient(180deg,rgba(224,160,70,.12),transparent 40%);
    transition:transform .45s cubic-bezier(.2,.7,.2,1),opacity .45s;z-index:1}
  .doc.out{transform:translateX(60cqw) rotate(10deg);opacity:0}
  .doc.in{transform:translateY(-20cqw) rotate(-6deg);opacity:0}
  .stampspr{position:absolute;width:9cqw;max-width:100%;transform:translate(-50%,-100%);pointer-events:none;z-index:3;animation:drop .95s cubic-bezier(.3,.1,.2,1) forwards;filter:drop-shadow(0 1.2cqw 1.2cqw rgba(0,0,0,.55))}
  @keyframes drop{0%{transform:translate(-50%,-160%) scale(1.15);opacity:0}25%{opacity:1}34%{transform:translate(-50%,-40%) scale(1)}38%{transform:translate(-50%,-38%) scale(1,.94)}55%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-180%) scale(1.1);opacity:0}}

  .drawer{position:absolute;left:0;top:0;bottom:0;width:23%;background:rgba(14,20,36,.97);border-right:1px solid var(--line);transform:translateX(-102%);transition:transform .35s cubic-bezier(.2,.7,.2,1);font-size:clamp(9px,.85cqw,14px);overflow:auto;z-index:4;color:var(--ink)}
  .drawer.open{transform:none}
  .bubble{position:absolute;right:2%;top:8%;width:32%;display:flex;gap:1cqw;align-items:flex-start;background:rgba(14,20,36,.96);border:1px solid var(--lamp);padding:1cqw 1.2cqw;font-size:clamp(9px,.9cqw,15px);z-index:5;box-shadow:0 1cqw 2cqw rgba(0,0,0,.5);animation:print .3s ease-out}
  .bubble b{display:block;font-family:var(--f-mono);font-size:.8em;letter-spacing:.08em;text-transform:uppercase;color:var(--lamp);margin-bottom:.3em;font-weight:500}
  .bava{width:4.5cqw;height:6cqw;flex:none;background:#16223a center/cover;border:1px solid var(--line)}
  .pausecover{position:absolute;inset:0;background:rgba(8,11,20,.55);color:var(--paper);border:0;font-family:var(--f-display);font-size:2cqw;z-index:6}

  .actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
  .tools,.stampsbar{display:flex;flex-wrap:wrap;gap:8px}
  .tool{background:transparent;border:1px solid var(--line);color:var(--ink);padding:9px 12px;font-size:13px}
  .tool[aria-pressed="true"]{background:var(--mark);color:#1d1d16;border-color:var(--mark)}
  .tool:disabled{opacity:.4;cursor:not-allowed}
  .sbtn{font-family:var(--f-display);font-size:13px;letter-spacing:.03em;padding:10px 14px;background:transparent;border:3px solid currentColor}
  .sbtn small{display:block;font-family:var(--f-mono);font-size:10px}
  .sbtn:disabled{opacity:.35;cursor:not-allowed}
  .s-allow{color:#86b46f}.s-block{color:#e0675b}.s-escalate{color:#e3a54a}

  .slips{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:20;display:grid;gap:8px;width:min(420px,calc(100vw - 32px));pointer-events:none}
  .slip{background:#f1ede2;color:var(--paper-ink);font-family:var(--f-mono);font-size:12.5px;padding:10px 13px;border-top:6px dashed var(--alarm);box-shadow:0 10px 24px rgba(0,0,0,.5);animation:print .3s ease-out}
  .slip b{display:block;font-family:var(--f-display);font-weight:400;font-size:13px;color:var(--alarm);margin-bottom:3px}
  .slip.good{border-top-color:var(--ok)}.slip.good b{color:var(--ok)}
  .slip.info{border-top-color:var(--soft)}.slip.info b{color:#4a5060}
  @keyframes print{from{transform:translateY(-14px);opacity:0}}

  .ov{position:fixed;inset:0;z-index:30;background:rgba(10,12,20,.82);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;
    padding:calc(20px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px))}
  .sheet{background:var(--paper);color:var(--paper-ink);max-width:720px;width:100%;padding:26px 26px 28px;box-shadow:0 24px 60px rgba(0,0,0,.6);display:grid;gap:12px}
  .sheet.wide{max-width:860px}
  .sheet h2{font-family:var(--f-display);font-weight:400;font-size:22px;margin:0;text-wrap:balance}
  .sheet h3{font-family:var(--f-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6a6658;margin:8px 0 0;font-weight:500}
  .sheet p{margin:0;max-width:66ch}
  .sub{font-family:var(--f-mono);font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:#6a6658}
  .how{display:grid;gap:7px;margin:0;padding-left:20px}
  .keys{font-family:var(--f-mono);font-size:12px;color:#6a6658}
  .btns{display:flex;flex-wrap:wrap;gap:10px}
  .go{font-family:var(--f-display);font-size:14px;background:var(--paper-ink);color:var(--paper);border:0;padding:12px 18px;justify-self:start}
  .go.ghost{background:transparent;color:var(--paper-ink);border:2px solid var(--paper-ink)}
  .news{margin:0;padding-left:20px;display:grid;gap:7px;max-width:66ch}
  .news .good{color:var(--ok)}.news .bad{color:var(--alarm)}
  .meta2{font-family:var(--f-mono);font-size:12px;color:#6a6658}
  .totals{display:flex;flex-wrap:wrap;gap:20px;font-family:var(--f-mono);font-variant-numeric:tabular-nums}
  .totals div{display:grid}
  .totals small{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6a6658}
  .totals b{font-family:var(--f-display);font-weight:400;font-size:20px}
  .jump{justify-self:start;background:transparent;border:1.5px solid var(--paper-ink);color:var(--paper-ink);padding:6px 12px;font-family:var(--f-mono);font-size:12px}
  .rep{display:grid;gap:12px}
  .rep article{border-top:1px solid #b9b3a0;padding-top:10px;display:grid;gap:4px;font-size:14px}
  .rep header{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;justify-content:space-between}
  .rep h4{margin:0;font-size:15px}
  .chip{font-family:var(--f-mono);font-size:11px;padding:2px 8px;border:1.5px solid currentColor;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
  .chip.good{color:var(--ok)}.chip.mid{color:var(--stamp-esc)}.chip.bad{color:var(--alarm)}
  .meta{font-family:var(--f-mono);font-size:12px;color:#6a6658}
  .key{font-size:13px;border-left:3px solid var(--stamp-esc);padding:3px 10px}
  .src{font-size:13px;background:#d8d0bb;padding:8px 10px}
  .src b{font-family:var(--f-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
  .evening,.final{border-top:2px solid var(--paper-ink);padding-top:6px;display:grid;gap:10px}
  .ups{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
  .up{display:grid;gap:4px;text-align:left;background:transparent;border:1.5px solid var(--paper-ink);color:var(--paper-ink);padding:10px 12px;align-content:start}
  .upn{font-weight:600;font-size:14px}
  .upc{font-family:var(--f-mono);font-size:12px;color:#6a6658}
  .upd{font-size:12.5px;color:#6a6658}
  .up.on{background:var(--paper-ink);color:var(--paper)}
  .up.on .upc,.up.on .upd{color:inherit;opacity:.85}
  .up:disabled{opacity:.45;cursor:not-allowed}
  .chainbox{border:2px solid currentColor;padding:12px 14px;display:grid;gap:6px}
  .chainbox p{color:var(--paper-ink);font-size:13px}
  .chainbox.good{color:var(--ok)}.chainbox.mid{color:var(--stamp-esc)}.chainbox.bad{color:var(--alarm)}
  .ltag{font-family:var(--f-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase}

  /* вертикальный стол для телефона */
  .port .screen{font-size:1.45cqw;padding:1cqw 1.3cqw}
  .port .hd{font-size:1.2cqw}
  .port .sclock{font-size:4.2cqw}
  .port .q div:nth-child(n+6){display:none}
  .port .al div{grid-template-columns:7cqw minmax(0,1fr)}
  .port .tip{font-size:2.4cqw;padding:.4cqw .9cqw}
  .port .doc{font-size:max(11px,2.75cqw);padding:3.2cqw 3.6cqw;transform:none}
  .port .doc.out{transform:translateX(100cqw) rotate(8deg)}
  .port .doc.in{transform:translateY(-30cqw)}
  .port .stampspr{width:22cqw}
  .port .drawer{width:100%;bottom:auto;height:39%;border-right:0;border-bottom:1px solid var(--line);transform:translateY(-102%);font-size:max(11px,2.8cqw)}
  .port .drawer.open{transform:none}
  .port .bubble{left:4%;right:4%;top:auto;bottom:3%;width:auto;font-size:max(11px,2.9cqw);padding:2.5cqw 3cqw}
  .port .bava{width:12cqw;height:16cqw}
  .port .pausecover{font-size:5cqw}
  @media (max-width:560px){
    .actions{position:sticky;bottom:0;background:var(--night);padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px));z-index:10}
    .tools,.stampsbar{width:100%}
    .tool{flex:1 1 auto;padding:8px 8px;font-size:12px}
    .sbtn{flex:1 1 0;padding:12px 4px;font-size:11px}
    .meters{gap:4px 12px}
    .bar{width:56px}
  }
</style>
