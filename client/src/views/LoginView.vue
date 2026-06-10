<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  NCard,
  NTabs,
  NTabPane,
  NForm,
  NFormItem,
  NInput,
  NButton,
  useMessage,
} from 'naive-ui';
import { useAuthStore } from '../stores/auth';
import { ApiError } from '../api/client';

const auth = useAuthStore();
const router = useRouter();
const message = useMessage();

const tab = ref<'login' | 'register'>('login');
const email = ref('');
const name = ref('');
const password = ref('');
const loading = ref(false);

async function submit() {
  loading.value = true;
  try {
    if (tab.value === 'login') {
      await auth.login(email.value, password.value);
    } else {
      await auth.register(email.value, name.value, password.value);
    }
    router.push({ name: 'projects' });
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Что-то пошло не так');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="grid h-full place-items-center p-4">
    <div class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <div class="text-3xl font-bold tracking-tight">🏃 Sprint Tracker</div>
        <div class="mt-1 text-sm text-slate-400">
          Доска спринтов, спидометры и горящие задачи
        </div>
      </div>
      <n-card>
        <n-tabs v-model:value="tab" justify-content="space-evenly" type="line">
          <n-tab-pane name="login" tab="Вход" />
          <n-tab-pane name="register" tab="Регистрация" />
        </n-tabs>
        <n-form class="mt-4" @submit.prevent="submit">
          <n-form-item v-if="tab === 'register'" label="Имя">
            <n-input v-model:value="name" placeholder="Как вас зовут" />
          </n-form-item>
          <n-form-item label="Email">
            <n-input v-model:value="email" placeholder="you@example.com" />
          </n-form-item>
          <n-form-item label="Пароль">
            <n-input
              v-model:value="password"
              type="password"
              show-password-on="click"
              placeholder="Минимум 6 символов"
              @keyup.enter="submit"
            />
          </n-form-item>
          <n-button
            type="primary"
            block
            :loading="loading"
            attr-type="submit"
          >
            {{ tab === 'login' ? 'Войти' : 'Создать аккаунт' }}
          </n-button>
        </n-form>
      </n-card>
    </div>
  </div>
</template>
