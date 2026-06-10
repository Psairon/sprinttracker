<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  NButton,
  NModal,
  NInput,
  NSelect,
  NDatePicker,
  NTag,
  NEmpty,
  NSpin,
  NFormItem,
  NPopconfirm,
  useMessage,
} from 'naive-ui';
import TopBar from '../components/TopBar.vue';
import { api, ApiError } from '../api/client';
import {
  type TeamMember,
  type Satisfaction,
  type FeedbackState,
  SATISFACTION_ORDER,
  SATISFACTION_META,
  FEEDBACK_LABELS,
  FEEDBACK_TYPE,
} from '../api/types';

const message = useMessage();
const members = ref<TeamMember[]>([]);
const loading = ref(true);

const satisfactionOptions = SATISFACTION_ORDER.map((s) => ({
  label: `${SATISFACTION_META[s].emoji}  ${SATISFACTION_META[s].label}`,
  value: s,
}));
const feedbackOptions = (Object.keys(FEEDBACK_LABELS) as FeedbackState[]).map(
  (f) => ({ label: FEEDBACK_LABELS[f], value: f }),
);

async function load() {
  loading.value = true;
  try {
    members.value = await api.get<TeamMember[]>('/team');
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка загрузки');
  } finally {
    loading.value = false;
  }
}

// ---- Add / edit ----
const showEdit = ref(false);
const editingId = ref<string | null>(null);
const form = ref({
  firstName: '',
  lastName: '',
  specialization: '',
  vacationStart: null as number | null,
  vacationEnd: null as number | null,
  feedback: 'not_needed' as FeedbackState,
  satisfaction: 'meets' as Satisfaction,
});
const saving = ref(false);

function openAdd() {
  editingId.value = null;
  form.value = {
    firstName: '',
    lastName: '',
    specialization: '',
    vacationStart: null,
    vacationEnd: null,
    feedback: 'not_needed',
    satisfaction: 'meets',
  };
  showEdit.value = true;
}

function openEdit(m: TeamMember) {
  editingId.value = m.id;
  form.value = {
    firstName: m.firstName,
    lastName: m.lastName,
    specialization: m.specialization,
    vacationStart: m.vacationStart ? Date.parse(m.vacationStart) : null,
    vacationEnd: m.vacationEnd ? Date.parse(m.vacationEnd) : null,
    feedback: m.feedback,
    satisfaction: m.satisfaction,
  };
  showEdit.value = true;
}

function toIso(ts: number | null): string | null {
  return ts ? new Date(ts).toISOString().slice(0, 10) : null;
}

async function save() {
  if (!form.value.firstName.trim()) {
    message.warning('Укажите имя');
    return;
  }
  saving.value = true;
  const payload = {
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    specialization: form.value.specialization,
    vacationStart: toIso(form.value.vacationStart),
    vacationEnd: toIso(form.value.vacationEnd),
    feedback: form.value.feedback,
    satisfaction: form.value.satisfaction,
  };
  try {
    if (editingId.value) {
      await api.patch(`/team/${editingId.value}`, payload);
    } else {
      await api.post('/team', payload);
    }
    showEdit.value = false;
    await load();
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  } finally {
    saving.value = false;
  }
}

async function remove(m: TeamMember) {
  try {
    await api.delete(`/team/${m.id}`);
    await load();
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  }
}

// ---- Notes (separate modal) ----
const showNotes = ref(false);
const notesMember = ref<TeamMember | null>(null);
const notesDraft = ref('');
function openNotes(m: TeamMember) {
  notesMember.value = m;
  notesDraft.value = m.notes;
  showNotes.value = true;
}
async function saveNotes() {
  if (!notesMember.value) return;
  try {
    await api.patch(`/team/${notesMember.value.id}`, { notes: notesDraft.value });
    showNotes.value = false;
    await load();
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  }
}

function fullName(m: TeamMember) {
  return `${m.firstName} ${m.lastName}`.trim();
}
function vacation(m: TeamMember) {
  if (!m.vacationStart) return null;
  return m.vacationEnd
    ? `${m.vacationStart} → ${m.vacationEnd}`
    : `с ${m.vacationStart}`;
}

onMounted(load);
</script>

<template>
  <div class="flex h-full flex-col">
    <TopBar :breadcrumb="[{ label: 'Моя команда' }]" />
    <main class="mx-auto w-full max-w-6xl flex-1 p-6">
      <div class="mb-5 flex items-center justify-between">
        <h1 class="text-xl font-semibold">Моя команда</h1>
        <n-button type="primary" @click="openAdd">+ Добавить участника</n-button>
      </div>

      <n-spin :show="loading">
        <n-empty
          v-if="!loading && members.length === 0"
          description="Пока никого нет — добавьте первого участника"
          class="py-16"
        />
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="m in members"
            :key="m.id"
            class="rounded-xl border-l-4 border-y border-r border-edge bg-panel/50 p-4"
            :style="{ borderLeftColor: SATISFACTION_META[m.satisfaction].color }"
          >
            <div class="flex items-start justify-between">
              <div>
                <div class="text-lg font-semibold">{{ fullName(m) }}</div>
                <div class="text-sm text-slate-400">
                  {{ m.specialization || 'без специализации' }}
                </div>
              </div>
              <div
                class="rounded-lg px-2 py-1 text-center text-xs"
                :style="{
                  background: SATISFACTION_META[m.satisfaction].color + '22',
                  color: SATISFACTION_META[m.satisfaction].color,
                }"
                :title="SATISFACTION_META[m.satisfaction].label"
              >
                <div class="text-xl leading-none">
                  {{ SATISFACTION_META[m.satisfaction].emoji }}
                </div>
                <div class="mt-0.5">
                  {{ SATISFACTION_META[m.satisfaction].label }}
                </div>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <n-tag
                size="small"
                :bordered="false"
                :type="FEEDBACK_TYPE[m.feedback]"
                >Обратная связь: {{ FEEDBACK_LABELS[m.feedback] }}</n-tag
              >
              <n-tag
                v-if="vacation(m)"
                size="small"
                :bordered="false"
                type="info"
                >🏖 {{ vacation(m) }}</n-tag
              >
            </div>

            <p
              v-if="m.notes"
              class="mt-2 line-clamp-2 text-xs text-slate-400"
              :title="m.notes"
            >
              📝 {{ m.notes }}
            </p>

            <div class="mt-3 flex items-center gap-3 text-xs">
              <button class="text-sky-300 hover:underline" @click="openNotes(m)">
                Заметки
              </button>
              <button
                class="text-slate-300 hover:underline"
                @click="openEdit(m)"
              >
                Изменить
              </button>
              <n-popconfirm @positive-click="() => remove(m)">
                <template #trigger>
                  <button class="text-red-400 hover:underline">Удалить</button>
                </template>
                Удалить участника?
              </n-popconfirm>
            </div>
          </div>
        </div>
      </n-spin>
    </main>

    <!-- Add / edit member -->
    <n-modal
      v-model:show="showEdit"
      preset="card"
      :title="editingId ? 'Изменить участника' : 'Новый участник'"
      style="max-width: 560px"
    >
      <div class="grid grid-cols-2 gap-3">
        <n-form-item label="Имя">
          <n-input v-model:value="form.firstName" placeholder="Имя" />
        </n-form-item>
        <n-form-item label="Фамилия">
          <n-input v-model:value="form.lastName" placeholder="Фамилия" />
        </n-form-item>
      </div>
      <n-form-item label="Специализация">
        <n-input
          v-model:value="form.specialization"
          placeholder="Например, Frontend-разработчик"
        />
      </n-form-item>
      <div class="grid grid-cols-2 gap-3">
        <n-form-item label="Отпуск с">
          <n-date-picker
            v-model:value="form.vacationStart"
            type="date"
            class="w-full"
            clearable
          />
        </n-form-item>
        <n-form-item label="Отпуск по">
          <n-date-picker
            v-model:value="form.vacationEnd"
            type="date"
            class="w-full"
            clearable
          />
        </n-form-item>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <n-form-item label="Обратная связь">
          <n-select v-model:value="form.feedback" :options="feedbackOptions" />
        </n-form-item>
        <n-form-item label="Удовлетворённость работой">
          <n-select
            v-model:value="form.satisfaction"
            :options="satisfactionOptions"
          />
        </n-form-item>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showEdit = false">Отмена</n-button>
          <n-button type="primary" :loading="saving" @click="save"
            >Сохранить</n-button
          >
        </div>
      </template>
    </n-modal>

    <!-- Notes modal -->
    <n-modal
      v-model:show="showNotes"
      preset="card"
      :title="`Заметки — ${notesMember ? fullName(notesMember) : ''}`"
      style="max-width: 480px"
    >
      <n-input
        v-model:value="notesDraft"
        type="textarea"
        :rows="6"
        placeholder="Любые заметки об участнике"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showNotes = false">Отмена</n-button>
          <n-button type="primary" @click="saveNotes">Сохранить</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>
