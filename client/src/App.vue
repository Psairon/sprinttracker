<script setup lang="ts">
import { onMounted } from 'vue';
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLoadingBarProvider,
  darkTheme,
  type GlobalThemeOverrides,
} from 'naive-ui';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#4f7cff',
    primaryColorHover: '#6b91ff',
    primaryColorPressed: '#3a63d6',
    borderRadius: '10px',
    fontFamily:
      "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
};

onMounted(() => auth.loadMe());
</script>

<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-loading-bar-provider>
      <n-message-provider>
        <n-dialog-provider>
          <router-view v-if="auth.ready" />
          <div v-else class="grid h-full place-items-center text-slate-500">
            Загрузка…
          </div>
        </n-dialog-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>
