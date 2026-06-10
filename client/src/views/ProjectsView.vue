<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  NButton,
  NModal,
  NCard,
  NInput,
  NEmpty,
  NSpin,
  useMessage,
} from 'naive-ui';
import TopBar from '../components/TopBar.vue';
import { api, ApiError } from '../api/client';
import type { Project } from '../api/types';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const message = useMessage();
const auth = useAuthStore();

const projects = ref<Project[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const newName = ref('');
const creating = ref(false);

async function load() {
  loading.value = true;
  try {
    projects.value = await api.get<Project[]>('/projects');
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка загрузки');
  } finally {
    loading.value = false;
  }
}

async function create() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    const p = await api.post<Project>('/projects', { name: newName.value });
    showCreate.value = false;
    newName.value = '';
    router.push({ name: 'sprints', params: { projectId: p.id } });
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка создания');
  } finally {
    creating.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="flex h-full flex-col">
    <TopBar />
    <main class="mx-auto w-full max-w-5xl flex-1 p-6">
      <div class="mb-5 flex items-center justify-between">
        <h1 class="text-xl font-semibold">Проекты</h1>
        <n-button type="primary" @click="showCreate = true"
          >+ Новый проект</n-button
        >
      </div>

      <n-spin :show="loading">
        <n-empty
          v-if="!loading && projects.length === 0"
          description="Пока нет проектов — создайте первый"
          class="py-16"
        />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <n-card
            v-for="p in projects"
            :key="p.id"
            hoverable
            class="cursor-pointer"
            @click="router.push({ name: 'sprints', params: { projectId: p.id } })"
          >
            <div class="text-lg font-medium">{{ p.name }}</div>
            <div class="mt-2 text-xs text-slate-400">
              {{ p.ownerId === auth.user?.id ? 'Вы владелец' : 'Доступ выдан' }}
            </div>
          </n-card>
        </div>
      </n-spin>
    </main>

    <n-modal
      v-model:show="showCreate"
      preset="card"
      title="Новый проект"
      class="max-w-md"
    >
      <n-input
        v-model:value="newName"
        placeholder="Название проекта"
        @keyup.enter="create"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showCreate = false">Отмена</n-button>
          <n-button type="primary" :loading="creating" @click="create"
            >Создать</n-button
          >
        </div>
      </template>
    </n-modal>
  </div>
</template>
