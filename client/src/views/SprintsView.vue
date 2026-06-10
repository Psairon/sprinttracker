<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  NButton,
  NModal,
  NCard,
  NInput,
  NInputNumber,
  NFormItem,
  NEmpty,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui';
import TopBar from '../components/TopBar.vue';
import { api, ApiError } from '../api/client';
import type { Project, Sprint } from '../api/types';

const props = defineProps<{ projectId: string }>();
const router = useRouter();
const message = useMessage();

const project = ref<Project | null>(null);
const sprints = ref<Sprint[]>([]);
const loading = ref(true);

const showCreate = ref(false);
const newName = ref('');
const newDeadline = ref<number>(5);
const creating = ref(false);

async function load() {
  loading.value = true;
  try {
    [project.value, sprints.value] = await Promise.all([
      api.get<Project>(`/projects/${props.projectId}`),
      api.get<Sprint[]>(`/projects/${props.projectId}/sprints`),
    ]);
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
    const s = await api.post<Sprint>(`/projects/${props.projectId}/sprints`, {
      name: newName.value,
      deadlineDays: newDeadline.value,
    });
    showCreate.value = false;
    newName.value = '';
    newDeadline.value = 5;
    router.push({ name: 'board', params: { sprintId: s.id } });
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
    <TopBar :breadcrumb="[{ label: project?.name || '…' }]" />
    <main class="mx-auto w-full max-w-5xl flex-1 p-6">
      <div class="mb-5 flex items-center justify-between">
        <h1 class="text-xl font-semibold">Спринты</h1>
        <n-button type="primary" @click="showCreate = true"
          >+ Новый спринт</n-button
        >
      </div>

      <n-spin :show="loading">
        <n-empty
          v-if="!loading && sprints.length === 0"
          description="В проекте ещё нет спринтов"
          class="py-16"
        />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <n-card
            v-for="s in sprints"
            :key="s.id"
            hoverable
            class="cursor-pointer"
            @click="router.push({ name: 'board', params: { sprintId: s.id } })"
          >
            <div class="flex items-center justify-between">
              <div class="text-lg font-medium">{{ s.name }}</div>
              <n-tag size="small" :bordered="false" type="warning">
                дедлайн {{ s.deadlineDays }}д
              </n-tag>
            </div>
          </n-card>
        </div>
      </n-spin>
    </main>

    <n-modal
      v-model:show="showCreate"
      preset="card"
      title="Новый спринт"
      class="max-w-md"
    >
      <n-form-item label="Название">
        <n-input v-model:value="newName" placeholder="Например, Sprint 12" />
      </n-form-item>
      <n-form-item label="Дедлайн подзадачи по умолчанию (дней)">
        <n-input-number v-model:value="newDeadline" :min="1" class="w-full" />
      </n-form-item>
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
