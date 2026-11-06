<script lang="ts">
  import Scene from './scene/Scene.svelte';
  let view = $state<'title' | 'scene'>('title');
</script>

{#if view === 'title'}
  <main class="title">
    <p class="eyebrow">SOC · «Северный терминал»</p>
    <h1>ПЕРИМЕТР</h1>
    <p class="lead">Игра для специалистов по ИБ в духе Papers, Please. Письма, логи, звонки в helpdesk и заявки на доступ, основанные на реальных инцидентах.</p>
    <div class="actions">
      <a class="btn primary" href="prototypes/perimetr-v0.html">Играть прототип · 3 смены</a>
      <button class="btn" type="button" onclick={() => (view = 'scene')}>Новая сцена · в разработке</button>
    </div>
    <p class="small">Прототип собран в чате и сохранён как есть. Новая версия с графикой и звуком строится здесь.</p>
  </main>
{:else}
  <Scene onexit={() => (view = 'title')} />
{/if}

<style>
  .title{max-width:640px;margin:12vh auto 0;display:grid;gap:16px}
  .eyebrow{font-family:var(--f-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);margin:0}
  h1{font-family:var(--f-display);font-weight:400;font-size:clamp(36px,9vw,64px);margin:0;color:var(--paper);letter-spacing:.04em}
  .lead{font-size:17px;margin:0;max-width:56ch}
  .actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
  .btn{display:inline-block;text-decoration:none;font-family:var(--f-mono);font-size:14px;padding:12px 16px;border:1.5px solid var(--lamp);color:var(--lamp);background:transparent}
  .btn.primary{background:var(--lamp);color:#141824}
  .small{font-size:13px;color:var(--soft);margin:0}
</style>
