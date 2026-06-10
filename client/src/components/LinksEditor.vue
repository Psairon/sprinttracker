<script setup lang="ts">
import { ref } from 'vue';
import { NInput, NButton } from 'naive-ui';

const props = withDefaults(
  defineProps<{ links: string[] | null; compact?: boolean }>(),
  { compact: false },
);
const emit = defineEmits<{ change: [string[]] }>();

const draft = ref('');
const adding = ref(false);

function normalize(url: string): string {
  const u = url.trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function label(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}

function add() {
  const url = normalize(draft.value);
  if (!url) return;
  emit('change', [...(props.links ?? []), url]);
  draft.value = '';
  adding.value = false;
}

function remove(i: number) {
  const next = [...(props.links ?? [])];
  next.splice(i, 1);
  emit('change', next);
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <a
      v-for="(url, i) in links ?? []"
      :key="i"
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      class="group inline-flex max-w-[220px] items-center gap-1 rounded-md border border-edge bg-ink px-2 py-0.5 text-xs text-sky-300 hover:border-sky-500"
      @click.stop
    >
      <span>🔗</span>
      <span class="truncate">{{ label(url) }}</span>
      <span
        class="text-slate-500 hover:text-red-400"
        title="Удалить"
        @click.stop.prevent="remove(i)"
        >✕</span
      >
    </a>

    <div v-if="adding" class="flex items-center gap-1">
      <n-input
        v-model:value="draft"
        size="tiny"
        placeholder="https://…"
        style="width: 200px"
        @keyup.enter="add"
        @click.stop
      />
      <n-button size="tiny" type="primary" @click.stop="add">ОК</n-button>
    </div>
    <n-button
      v-else
      size="tiny"
      :quaternary="!compact"
      :text="compact"
      @click.stop="adding = true"
      >+ ссылка</n-button
    >
  </div>
</template>
