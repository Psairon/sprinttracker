<script setup lang="ts">
import { computed } from 'vue';
import { NProgress } from 'naive-ui';

const props = withDefaults(
  defineProps<{
    percentage: number;
    label?: string;
    sublabel?: string;
    color?: string;
    size?: number;
    danger?: boolean;
  }>(),
  { size: 150 },
);

// Auto colour by completion unless an explicit colour is provided.
const resolvedColor = computed(() => {
  if (props.danger) return '#f87171';
  if (props.color) return props.color;
  if (props.percentage >= 80) return '#34d399';
  if (props.percentage >= 40) return '#fbbf24';
  return '#60a5fa';
});
</script>

<template>
  <div class="flex flex-col items-center">
    <n-progress
      type="dashboard"
      :percentage="Math.min(100, Math.max(0, percentage))"
      :color="resolvedColor"
      :stroke-width="9"
      :offset-degree="0"
      :style="{ width: size + 'px' }"
    >
      <div class="text-center">
        <div class="text-2xl font-semibold" :style="{ color: resolvedColor }">
          {{ Math.round(percentage) }}%
        </div>
        <div v-if="sublabel" class="mt-0.5 text-xs text-slate-400">
          {{ sublabel }}
        </div>
      </div>
    </n-progress>
    <div v-if="label" class="mt-1 text-sm font-medium text-slate-300">
      {{ label }}
    </div>
  </div>
</template>
