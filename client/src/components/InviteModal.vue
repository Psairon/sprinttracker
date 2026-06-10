<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  NModal,
  NButton,
  NInput,
  NList,
  NListItem,
  NTag,
  NPopconfirm,
  useMessage,
} from 'naive-ui';
import { api, ApiError } from '../api/client';
import type { Member } from '../api/types';
import { useAuthStore } from '../stores/auth';

const props = defineProps<{ show: boolean; sprintId: string }>();
const emit = defineEmits<{ 'update:show': [boolean] }>();

const message = useMessage();
const auth = useAuthStore();

const members = ref<Member[]>([]);
const email = ref('');
const loading = ref(false);
const inviting = ref(false);

async function loadMembers() {
  loading.value = true;
  try {
    members.value = await api.get<Member[]>(`/sprints/${props.sprintId}/members`);
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  } finally {
    loading.value = false;
  }
}

async function invite() {
  if (!email.value.trim()) return;
  inviting.value = true;
  try {
    await api.post(`/sprints/${props.sprintId}/invite`, { email: email.value });
    email.value = '';
    message.success('Доступ выдан');
    await loadMembers();
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Не удалось пригласить');
  } finally {
    inviting.value = false;
  }
}

async function remove(m: Member) {
  try {
    await api.delete(`/sprints/${props.sprintId}/members/${m.id}`);
    await loadMembers();
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  }
}

watch(
  () => props.show,
  (v) => v && loadMembers(),
);
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    style="max-width: 480px"
    title="Доступ к спринту"
    @update:show="emit('update:show', $event)"
  >
    <div class="flex gap-2">
      <n-input
        v-model:value="email"
        placeholder="email пользователя"
        @keyup.enter="invite"
      />
      <n-button type="primary" :loading="inviting" @click="invite"
        >Пригласить</n-button
      >
    </div>
    <p class="mt-2 text-xs text-slate-500">
      Пользователь должен быть зарегистрирован. Доступ выдаётся к этому спринту.
    </p>

    <n-list class="mt-3" :show-divider="false">
      <n-list-item v-for="m in members" :key="m.id">
        <div class="flex w-full items-center justify-between">
          <div>
            <div class="text-sm">{{ m.name }}</div>
            <div class="text-xs text-slate-500">{{ m.email }}</div>
          </div>
          <div class="flex items-center gap-2">
            <n-tag v-if="m.isCreator" size="small" type="info" :bordered="false"
              >создатель</n-tag
            >
            <n-popconfirm
              v-else-if="m.id !== auth.user?.id"
              @positive-click="() => remove(m)"
            >
              <template #trigger>
                <n-button size="tiny" text type="error">убрать</n-button>
              </template>
              Убрать доступ?
            </n-popconfirm>
          </div>
        </div>
      </n-list-item>
    </n-list>
  </n-modal>
</template>
