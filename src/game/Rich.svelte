<script lang="ts">
  // Текст с уликами [[ключ|текст]]. Улики — кликабельные поля режима инспекции.
  // block: пустая строка разделяет абзацы, перевод строки — <br>.
  import { getContext } from 'svelte';
  import { parseFields } from '../content';
  import type { Inspect } from './ui';

  let { text, block = false }: { text: string; block?: boolean } = $props();
  const ins = getContext<Inspect>('inspect');
  const paras = $derived(block ? text.trim().split(/\n\s*\n/) : [text]);
</script>

{#snippet line(p: string)}
  {#each p.split('\n') as ln, i}
    {#if i > 0}<br />{/if}
    {#each parseFields(ln) as piece}
      {#if piece.key}<span
          class="f"
          class:sel={ins?.sel === piece.key}
          class:hit={ins?.flash[piece.key] === 'hit'}
          class:miss={ins?.flash[piece.key] === 'miss'}
          data-k={piece.key}
          role="button"
          tabindex={ins?.on ? 0 : -1}>{piece.text}</span
        >{:else}{piece.text}{/if}
    {/each}
  {/each}
{/snippet}

{#each paras as p}
  {#if block}<p>{@render line(p)}</p>{:else}{@render line(p)}{/if}
{/each}
