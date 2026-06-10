<script setup lang="ts">
import { useRouter } from 'vue-router';
import { NButton, NDropdown } from 'naive-ui';
import { useAuthStore } from '../stores/auth';

defineProps<{ breadcrumb?: { label: string; to?: string }[] }>();

const auth = useAuthStore();
const router = useRouter();

function onUserAction(key: string) {
  if (key === 'logout') {
    auth.logout();
    router.push({ name: 'login' });
  }
}
</script>

<template>
  <header
    class="flex items-center justify-between border-b border-edge bg-panel/60 px-5 py-3 backdrop-blur"
  >
    <div class="flex items-center gap-2 text-sm">
      <span
        class="cursor-pointer font-bold"
        @click="router.push({ name: 'projects' })"
        >🏃 Sprint Tracker</span
      >
      <template v-for="(crumb, i) in breadcrumb" :key="i">
        <span class="text-slate-600">/</span>
        <span
          :class="
            crumb.to
              ? 'cursor-pointer text-slate-300 hover:text-white'
              : 'text-slate-400'
          "
          @click="crumb.to && router.push(crumb.to)"
          >{{ crumb.label }}</span
        >
      </template>
    </div>
    <div class="flex items-center gap-2">
      <n-button
        quaternary
        size="small"
        @click="router.push({ name: 'team' })"
        >👥 Моя команда</n-button
      >
      <n-dropdown
        trigger="click"
        :options="[{ label: 'Выйти', key: 'logout' }]"
        @select="onUserAction"
      >
        <n-button quaternary size="small">
          {{ auth.user?.name || auth.user?.email }} ▾
        </n-button>
      </n-dropdown>
    </div>
  </header>
</template>
