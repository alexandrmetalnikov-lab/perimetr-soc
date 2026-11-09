<script lang="ts">
  // Папка-справочник: бюллетень, сотрудники, контрагенты и ПО, матрица доступа, находки.
  import Rich from './Rich.svelte';
  import { byDay } from '../content';
  import type { Content } from '../content/types';
  import type { Finding } from './engine';
  import type { Tab } from './ui';
  let { content, day, tab = $bindable(), findings, esc, tools, onclose }: {
    content: Content; day: number; tab: Tab; findings: Finding[]; esc: number;
    tools: { sandbox: boolean; ti: boolean; nm: boolean; trial: boolean }; onclose: () => void;
  } = $props();

  const W = $derived(content.world);
  const rules = $derived(W.rules.filter(r => r.day <= day));
  const threats = $derived(W.threats.filter(r => r.day <= day));
  const date = $derived(W.days.find(d => d.n === day)?.date ?? '');
  const tabs = $derived<[Tab, string][]>([
    ['rules', 'Бюллетень'], ['staff', 'Сотрудники'], ['ext', 'Контрагенты и ПО'],
    ...(W.accessMatrix.day <= day ? [['acc', 'Доступ'] as [Tab, string]] : []),
    ['find', `Находки${findings.length ? ` · ${findings.length}` : ''}`],
  ]);
</script>

<div class="head">
  <div class="tabs" role="tablist">
    {#each tabs as [id, name]}
      <button type="button" role="tab" aria-selected={tab === id} onclick={() => (tab = id)}>{name}</button>
    {/each}
  </div>
  <button class="x" type="button" onclick={onclose} aria-label="Закрыть справочник">✕</button>
</div>

<div class="page">
  {#if tab === 'rules'}
    <h3>Регламенты на {date}</h3>
    <ol>{#each rules as r}<li><Rich text={`[[${r.key}|${r.text}]]`} />{#if r.day === day && day > 1}<span class="new">новое</span>{/if}</li>{/each}</ol>
    <h3>Текущие угрозы</h3>
    <ol>{#each threats as r}<li><Rich text={`[[${r.key}|${r.text}]]`} />{#if r.day === day && day > 1}<span class="new">новое</span>{/if}</li>{/each}</ol>
    <h3>Инструменты</h3>
    <p class="soft">
      {#if tools.trial}Пробные лицензии песочницы и TI-подписки действуют до конца смены.
      {:else}Песочница: {tools.sandbox ? 'есть' : 'нет'} · TI-подписка: {tools.ti ? 'есть' : 'нет'} · Number matching: {tools.nm ? 'включён' : 'нет'}{/if}
      <br />Вторая линия принимает ещё {esc} эскалаций за смену.
    </p>
  {:else if tab === 'staff'}
    <h3>Кадровая система</h3>
    <div class="dir">
      {#each W.staff as p}
        <div class="row"><b>{p.name} · <Rich text={p.dept ?? ''} /></b><span><Rich text={byDay(p.status, day) ?? ''} /></span><span class="mono"><Rich text={p.phone ?? ''} /></span></div>
      {/each}
    </div>
    {#if W.managers.day <= day}
      <h3>Руководители</h3>
      <div class="dir">{#each W.managers.list as m}<div class="row"><b>{m}</b></div>{/each}</div>
    {/if}
    <h3>ИТ-поддержка</h3>
    <p><Rich text={W.itSupport} /></p>
  {:else if tab === 'ext'}
    <h3>Контрагенты</h3>
    <div class="dir">
      {#each W.contractors.filter(x => x.day <= day) as x}
        <div class="row"><b>{x.name} · {x.contract}</b>{#each x.lines as l}<span><Rich text={l} /></span>{/each}
          {#if x.warning && x.warning.day <= day}<span class="warnline"><Rich text={x.warning.text} /></span>{/if}</div>
      {/each}
    </div>
    <h3>ПО и опубликованные хэши</h3>
    <div class="dir">
      {#each W.software.filter(x => x.day <= day) as x}
        <div class="row"><b>{x.name}</b>{#each x.lines as l}<span class="mono"><Rich text={l} /></span>{/each}</div>
      {/each}
    </div>
  {:else if tab === 'acc'}
    <h3>Матрица доступа</h3>
    <div class="scroll"><table class="mx">
      <thead><tr><th>Роль</th><th>Что можно</th><th>Согласует</th></tr></thead>
      <tbody>{#each W.accessMatrix.rows as r}<tr><td>{r.role}</td><td><Rich text={r.allows} /></td><td><Rich text={r.approver} /></td></tr>{/each}</tbody>
    </table></div>
  {:else}
    <h3>Находки по текущему объекту</h3>
    {#if findings.length}
      {#each findings as f}<div class="finding" class:call={f.call}>{f.text}</div>{/each}
    {:else}
      <p class="soft">Пока пусто. Включите инспекцию и кликните по двум полям, которые противоречат друг другу: в документе, справочнике или регламенте.</p>
    {/if}
  {/if}
</div>

<style>
  .head{display:flex;align-items:stretch;border-bottom:1px solid var(--line);position:sticky;top:0;background:inherit;z-index:1}
  .tabs{display:flex;flex-wrap:wrap;flex:1;min-width:0}
  .tabs button{flex:1 1 auto;background:transparent;border:0;border-right:1px solid var(--line);color:var(--soft);padding:.6em .5em;font-family:var(--f-mono);font-size:.72em;letter-spacing:.06em;text-transform:uppercase}
  .tabs button[aria-selected="true"]{background:var(--paper);color:var(--paper-ink)}
  .x{background:transparent;border:0;color:var(--ink);padding:0 .8em;font-size:1em}
  .page{padding:.8em 1em 1.2em;font-size:.92em}
  h3{font-family:var(--f-mono);font-size:.75em;letter-spacing:.12em;text-transform:uppercase;color:var(--lamp);margin:1em 0 .5em;font-weight:500}
  h3:first-child{margin-top:0}
  ol{margin:0;padding-left:1.3em;display:grid;gap:.45em}
  p{margin:0}
  .soft{color:var(--soft)}
  .new{font-family:var(--f-mono);font-size:.7em;letter-spacing:.08em;text-transform:uppercase;background:var(--mark);color:#1d1d16;padding:0 .4em;margin-left:.4em;white-space:nowrap}
  .dir{display:grid;gap:.6em}
  .row{border-bottom:1px dotted var(--line);padding-bottom:.5em;display:grid;gap:.1em}
  .row b{color:var(--paper);font-weight:600}
  .row span{color:var(--soft)}
  .mono{font-family:var(--f-mono);font-size:.92em}
  .warnline{color:#e0675b!important}
  .scroll{overflow-x:auto}
  table.mx{border-collapse:collapse;width:100%;font-size:.92em}
  table.mx th{text-align:left;font-family:var(--f-mono);font-weight:500;font-size:.8em;color:var(--soft);border-bottom:1px solid var(--line);padding:.3em .5em .3em 0}
  table.mx td{padding:.4em .5em .4em 0;border-bottom:1px dotted var(--line);vertical-align:top}
  table.mx td:first-child{color:var(--paper);font-weight:600}
  .finding{border-left:3px solid var(--mark);padding:.4em .7em;background:rgba(231,198,74,.08);margin-bottom:.5em}
  .finding.call{border-color:var(--ok)}
</style>
