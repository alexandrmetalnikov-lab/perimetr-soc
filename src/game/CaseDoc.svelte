<script lang="ts">
  // Объект на столе: письмо, звонок или алерт. Поверхность видна сразу, остальное — слоями «Изучить».
  import Rich from './Rich.svelte';
  import type { Block, Case, Decision, Person } from '../content/types';
  import type { CaseRun } from './engine';
  import { STAMP, portraitUrl } from './ui';

  let {
    c, r, index, total, upgrades, people, answered, mark,
    canUse, onreveal, onanswer,
  }: {
    c: Case; r: CaseRun; index: number; total: number; upgrades: string[];
    people: Map<string, Person>; answered: boolean; mark: Decision | null;
    canUse: (tool: string) => boolean; onreveal: (id: string) => void; onanswer: () => void;
  } = $props();

  const NEEDS: Record<string, string> = { sandbox: 'нужна песочница', ti: 'нужна TI-подписка' };
  const open = (layer?: string) => !layer || r.revealed.includes(layer);
  const label = (layer: string) => c.layers.find(l => l.id === layer)?.label ?? layer;
  const top = $derived((c.blocks ?? []).filter(b => b.at !== 'bottom'));
  const bottom = $derived((c.blocks ?? []).filter(b => b.at === 'bottom'));
  const sender = $derived(c.email?.sender ? people.get(c.email.sender) : undefined);
  const caller = $derived(c.phone_call?.caller ? people.get(c.phone_call.caller) : undefined);
  const callPerson = $derived(c.call?.person ? people.get(c.call.person) : undefined);
</script>

{#snippet blockView(b: Block)}
  {#if open(b.layer)}
    <div class="lyr">
      <div class="ltag">{label(b.layer)}</div>
      {#if b.headers}
        <div class="hdrs">{#each b.headers as [k, v]}<div><span>{k}:</span><span><Rich text={v} /></span></div>{/each}</div>
      {:else if b.table}
        <div class="scroll"><table class="log">
          {#if b.columns}<thead><tr><th>{b.columns[0]}</th><th>{b.columns[1]}</th></tr></thead>{/if}
          <tbody>{#each b.table as [k, v]}<tr><td><Rich text={k} /></td><td><Rich text={v} /></td></tr>{/each}</tbody>
        </table></div>
      {:else if b.note}
        <div class="note"><Rich text={b.note} block /></div>
      {/if}
    </div>
  {/if}
{/snippet}

<div class="kind"><span>Объект {index} из {total}</span><span>{c.type}</span></div>
<h2>{c.title}</h2>

<div class="probe">
  <span class="plabel">Изучить</span>
  {#each c.layers as l}
    {@const isOpen = r.revealed.includes(l.id)}
    {#if l.needs && !canUse(l.needs) && !isOpen}
      <button type="button" class="pbtn locked" disabled>🔒 {l.label}<em>{NEEDS[l.needs] ?? 'недоступно'}</em></button>
    {:else}
      <button type="button" class="pbtn" disabled={isOpen} onclick={() => onreveal(l.id)}>{isOpen ? '✓ ' : ''}{l.label}<em>{isOpen ? 'открыто' : `${l.cost} мин`}</em></button>
    {/if}
  {/each}
</div>

{#if r.called && c.call}
  <div class="callres">
    {#if portraitUrl(callPerson, c.call.emotion)}<div class="ava pic" style="background-image:url({portraitUrl(callPerson, c.call.emotion)})"></div>{/if}
    <div>
      <div class="ltag">Проверка по второму каналу · {c.call.label}</div>
      {c.call.text}
      {#if c.call.finding}<div class="cf">{c.call.finding}</div>{/if}
    </div>
  </div>
{/if}

{#if c.kind === 'email' && c.email}
  {@const e = c.email}
  {#if e.flag && upgrades.includes(e.flag.upgrade)}<div class="flagmsg">{e.flag.text}</div>{/if}
  <div class="mhead">
    {#if portraitUrl(sender)}<div class="ava pic" style="background-image:url({portraitUrl(sender)})" role="img" aria-label={e.from_name}></div>
    {:else}<div class="ava">{e.avatar}</div>{/if}
    <div class="mwho">
      <span><b>{e.from_name}</b> {#if open(e.from_addr.layer)}<span class="addr">&lt;<Rich text={e.from_addr.text} />&gt;</span>{/if}</span>
      <small>кому: {e.to} · {e.time}</small>
    </div>
  </div>
  {#each top as b}{@render blockView(b)}{/each}
  <div class="body"><Rich text={e.body} block /></div>
  {#if e.link}
    <p class="linkline"><span class="fakelink">{e.link.label}</span>
      {#if open(e.link.layer)}<span class="url"><Rich text={e.link.url} /></span>{/if}</p>
  {/if}
  {#if e.signature}<p>{e.signature}</p>{/if}
  {#if e.quote}<div class="quote"><Rich text={e.quote} block /></div>{/if}
  {#if e.attachment}<span class="att">📎 <Rich text={e.attachment} /></span>{/if}
  {#each bottom as b}{@render blockView(b)}{/each}
{:else if c.kind === 'call' && c.phone_call}
  {@const p = c.phone_call}
  {#if !answered}
    <button class="ringing" type="button" onclick={onanswer}>
      <span class="ring-ico">☎</span>
      <span><b>Входящий звонок</b><small>{p.line}</small><small>Снимите трубку: нажмите на телефон</small></span>
    </button>
  {:else}
    <div class="mhead">
      {#if portraitUrl(caller)}<div class="ava pic big" style="background-image:url({portraitUrl(caller)})" role="img" aria-label="Звонящий"></div>{/if}
      <div class="hdrs flat">
        <div><span>Линия:</span><span>{p.line}</span></div>
        {#if open(p.number.layer)}<div><span>Входящий (АТС):</span><span><Rich text={p.number.text} /></span></div>{/if}
      </div>
    </div>
    {#if p.note}<div class="note"><Rich text={p.note} /></div>{/if}
    <div class="transcript">
      {#each p.transcript as [who, text]}<p><b>{who}</b><Rich text={text} /></p>{/each}
    </div>
    {#each c.blocks ?? [] as b}{@render blockView(b)}{/each}
  {/if}
{:else if c.alert}
  <div class="alert"><span class="sev">{c.alert.severity}</span><b>{c.alert.title}</b><span><Rich text={c.alert.summary} /></span></div>
  {#each c.blocks ?? [] as b}{@render blockView(b)}{/each}
{/if}

{#if c.ticket && (c.kind !== 'call' || answered)}<div class="ticket"><Rich text={c.ticket} /></div>{/if}

{#if mark}<div class="mark" style="color:{STAMP[mark].color}">{STAMP[mark].mark}</div>{/if}

<style>
  .kind{font-family:var(--f-mono);font-size:.82em;letter-spacing:.12em;text-transform:uppercase;color:#6a6658;display:flex;justify-content:space-between;gap:1em}
  h2{font-family:var(--f-display);font-weight:400;font-size:1.22em;margin:.35em 0 .5em;text-wrap:balance;line-height:1.25}
  .probe{display:flex;flex-wrap:wrap;gap:.4em;align-items:center;margin:0 0 .9em;padding:.5em 0;border-top:1px dashed #a9a391;border-bottom:1px dashed #a9a391}
  .plabel{font-family:var(--f-mono);font-size:.75em;letter-spacing:.12em;text-transform:uppercase;color:#6a6658;margin-right:.2em}
  .pbtn{background:transparent;border:1.5px solid var(--paper-ink);color:var(--paper-ink);padding:.3em .6em;font-size:.86em;display:inline-flex;gap:.5em;align-items:baseline;text-align:left}
  .pbtn em{font-style:normal;font-family:var(--f-mono);font-size:.82em;color:#6a6658}
  .pbtn:hover:not(:disabled){background:var(--paper-ink);color:var(--paper)}
  .pbtn:hover:not(:disabled) em{color:inherit}
  .pbtn:disabled{border-style:dashed;opacity:.6;cursor:default}
  .pbtn.locked{border-style:dotted;opacity:.5}

  .mhead{display:flex;gap:.8em;align-items:center;margin-bottom:.8em}
  .ava{width:2.6em;height:2.6em;border-radius:50%;background:#d3c8ad;display:grid;place-items:center;font-family:var(--f-mono);font-weight:600;flex:none}
  .ava.pic{width:3.2em;height:3.2em;background-color:#16223a;background-size:240% auto;background-position:62% 28%;box-shadow:0 0 0 1px rgba(0,0,0,.25)}
  .ava.pic.big{width:4.4em;height:4.4em}
  .mwho{display:grid;gap:.1em;min-width:0;overflow-wrap:anywhere}
  .mwho small{color:#6a6658}
  .addr{font-family:var(--f-mono);font-size:.92em}
  .body :global(p){margin:0 0 .6em;max-width:62ch}
  .quote{border-left:3px solid #b9b3a0;padding:.2em .8em;color:#6a6658;font-size:.92em;margin:.4em 0 .8em}
  .quote :global(p){margin:0 0 .4em}
  .att{display:inline-block;font-family:var(--f-mono);font-size:.88em;border:1px solid #b2aa95;padding:.2em .6em;margin:.2em 0 .8em}
  .linkline{margin:0 0 .6em}
  .fakelink{color:#1f4fa8;text-decoration:underline}
  .url{font-family:var(--f-mono);font-size:.86em;margin-left:.5em}
  .flagmsg{background:rgba(76,122,60,.18);border:1.5px solid var(--ok);padding:.5em .7em;font-size:.92em;font-weight:600;margin-bottom:.8em}

  .lyr{margin:0 0 .8em;animation:reveal .6s ease-out}
  @keyframes reveal{from{background-color:rgba(231,198,74,.5)}}
  .ltag{font-family:var(--f-mono);font-size:.7em;letter-spacing:.12em;text-transform:uppercase;color:#9a6416;margin-bottom:.3em}
  .hdrs{font-family:var(--f-mono);font-size:.88em;border-top:1px dashed #a9a391;border-bottom:1px dashed #a9a391;padding:.5em 0;display:grid;gap:.2em}
  .hdrs.flat{border:0;padding:0}
  .hdrs div{display:grid;grid-template-columns:minmax(7em,auto) minmax(0,1fr);gap:.6em}
  .hdrs div span:first-child{color:#6a6658}
  .scroll{overflow-x:auto}
  table.log{border-collapse:collapse;width:100%;font-family:var(--f-mono);font-size:.86em;font-variant-numeric:tabular-nums}
  table.log th{text-align:left;font-weight:500;color:#6a6658;border-bottom:1px solid #a9a391;padding:.2em .6em .2em 0}
  table.log td{padding:.3em .6em .3em 0;border-bottom:1px dotted #bdb7a5;vertical-align:top}
  table.log td:first-child{color:#5b5c50;white-space:nowrap}
  .note{font-family:var(--f-mono);font-size:.88em;background:#d8d0bb;padding:.5em .7em;overflow-wrap:anywhere}
  .note :global(p){margin:0}
  .note :global(p+p){margin-top:.4em}
  .alert{border:1.5px solid var(--paper-ink);padding:.6em .8em;display:grid;gap:.3em;margin-bottom:.8em}
  .alert b{font-size:1.05em}
  .sev{justify-self:start;font-family:var(--f-mono);font-size:.7em;letter-spacing:.1em;text-transform:uppercase;padding:.05em .5em;background:var(--paper-ink);color:var(--paper)}
  .transcript{display:grid;gap:.5em;max-width:62ch;margin-bottom:.8em}
  .transcript p{margin:0}
  .transcript b{font-family:var(--f-mono);font-size:.8em;font-weight:600;color:#6a6658;margin-right:.4em}
  .ticket{margin-top:.6em;border-left:3px solid var(--stamp-esc);background:#d8d0bb;padding:.4em .7em;font-size:.9em}
  .callres{display:flex;gap:.7em;align-items:flex-start;margin:0 0 .9em;padding:.6em .8em;background:rgba(76,122,60,.14);border-left:3px solid var(--ok);animation:reveal .6s ease-out}
  .callres .ltag{color:var(--ok)}
  .cf{margin-top:.3em;font-weight:600}
  .ringing{display:flex;gap:1em;align-items:center;width:100%;background:#1a2438;color:var(--ink);border:0;padding:1em 1.2em;text-align:left;animation:pulse 1.2s infinite}
  .ringing b{display:block;font-family:var(--f-display);font-weight:400;font-size:1.05em;color:var(--lamp)}
  .ringing small{display:block;color:var(--soft);font-family:var(--f-mono);font-size:.8em}
  .ring-ico{font-size:2em;animation:wiggle .5s infinite}
  @keyframes pulse{50%{box-shadow:0 0 0 .4em rgba(224,160,70,.25)}}
  @keyframes wiggle{25%{transform:rotate(-12deg)}75%{transform:rotate(12deg)}}
  .mark{position:absolute;right:6%;top:8%;font-family:var(--f-display);font-size:2em;padding:.15em .5em;border:.22em solid currentColor;mix-blend-mode:multiply;pointer-events:none;animation:thunk .2s ease-out forwards;z-index:2}
  @keyframes thunk{from{transform:rotate(-13deg) scale(1.6);opacity:0}to{transform:rotate(-13deg) scale(1);opacity:.85}}
</style>
