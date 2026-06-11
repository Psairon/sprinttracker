<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NModal,
  NButton,
  NInput,
  NInputNumber,
  NSelect,
  NTag,
  NPopconfirm,
  NDivider,
  NEmpty,
  useMessage,
} from 'naive-ui';
import { api, ApiError } from '../api/client';
import LinksEditor from './LinksEditor.vue';
import {
  type Task,
  type Subtask,
  type Track,
  type Status,
  type TeamMember,
  TRACK_LABELS,
  TRACK_COLORS,
  STATUS_LABELS,
} from '../api/types';

const props = defineProps<{
  show: boolean;
  task: Task | null;
  sprintDeadline: number;
  burningIds: Set<string>;
  team: TeamMember[];
}>();

const assigneeOptions = computed(() => [
  { label: '— не назначен', value: null as string | null },
  ...props.team.map((m) => ({
    label: `${m.firstName} ${m.lastName}`.trim(),
    value: m.id,
  })),
]);
const emit = defineEmits<{
  'update:show': [boolean];
  changed: [];
  deleted: [];
}>();

const message = useMessage();

const trackOptions = (Object.keys(TRACK_LABELS) as Track[]).map((t) => ({
  label: TRACK_LABELS[t],
  value: t,
}));
const statusOptions = (Object.keys(STATUS_LABELS) as Status[]).map((s) => ({
  label: STATUS_LABELS[s],
  value: s,
}));

// New subtask form
const subTitle = ref('');
const subTrack = ref<Track>('analytics');
const subEstimate = ref<number>(0);
const subDeadline = ref<number | null>(null);
const subAssignee = ref<string | null>(null);
const adding = ref(false);

const subtasks = computed(() => props.task?.subtasks ?? []);

// Second estimate: actual = sum of subtask estimates (vs. planned manual one).
const actualHours = computed(() =>
  subtasks.value.reduce((acc, s) => acc + (s.estimateHours || 0), 0),
);

async function addSubtask() {
  if (!props.task || !subTitle.value.trim()) return;
  adding.value = true;
  try {
    await api.post(`/tasks/${props.task.id}/subtasks`, {
      title: subTitle.value,
      track: subTrack.value,
      estimateHours: subEstimate.value || 0,
      deadlineDays: subDeadline.value || undefined,
      assigneeId: subAssignee.value || undefined,
    });
    subTitle.value = '';
    subEstimate.value = 0;
    subDeadline.value = null;
    subAssignee.value = null;
    emit('changed');
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  } finally {
    adding.value = false;
  }
}

async function patchSubtask(sub: Subtask, patch: Partial<Subtask>) {
  try {
    await api.patch(`/subtasks/${sub.id}`, patch);
    emit('changed');
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  }
}

async function deleteSubtask(sub: Subtask) {
  try {
    await api.delete(`/subtasks/${sub.id}`);
    emit('changed');
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  }
}

async function patchTask(patch: Partial<Task>) {
  if (!props.task) return;
  try {
    await api.patch(`/tasks/${props.task.id}`, patch);
    emit('changed');
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  }
}

async function deleteTask() {
  if (!props.task) return;
  try {
    await api.delete(`/tasks/${props.task.id}`);
    emit('deleted');
    emit('update:show', false);
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  }
}

function effectiveDeadline(sub: Subtask): number {
  return sub.deadlineDays ?? props.sprintDeadline;
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    style="max-width: 720px"
    :title="task?.title || 'Задача'"
    @update:show="emit('update:show', $event)"
  >
    <template v-if="task">
      <!-- Editable title & description -->
      <div class="mb-3">
        <div class="mb-1 text-xs text-slate-400">Название</div>
        <n-input
          :value="task.title"
          placeholder="Название задачи"
          @change="(v: string) => v.trim() && patchTask({ title: v })"
        />
      </div>
      <div class="mb-3">
        <div class="mb-1 text-xs text-slate-400">Описание</div>
        <n-input
          :value="task.description || ''"
          type="textarea"
          :rows="2"
          placeholder="Описание задачи"
          @change="(v: string) => patchTask({ description: v })"
        />
      </div>

      <!-- Task-level controls -->
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <div class="mb-1 text-xs text-slate-400">Статус задачи</div>
          <n-select
            :value="task.status"
            :options="statusOptions"
            style="width: 170px"
            @update:value="(v: Status) => patchTask({ status: v })"
          />
        </div>
        <div>
          <div class="mb-1 text-xs text-slate-400">Оценка план, ч</div>
          <n-input-number
            :value="task.estimateHours"
            :min="0"
            style="width: 120px"
            @update:value="(v) => patchTask({ estimateHours: v || 0 })"
          />
        </div>
        <div>
          <div class="mb-1 text-xs text-slate-400">Факт (Σ подзадач)</div>
          <div
            class="flex h-[34px] w-[120px] items-center justify-center rounded-lg border border-edge bg-ink text-sm font-medium"
          >
            {{ actualHours }} ч
          </div>
        </div>
        <div class="ml-auto">
          <n-popconfirm @positive-click="deleteTask">
            <template #trigger>
              <n-button text type="error">Удалить задачу</n-button>
            </template>
            Удалить задачу со всеми подзадачами?
          </n-popconfirm>
        </div>
      </div>

      <div class="mt-3">
        <div class="mb-1 text-xs text-slate-400">Ссылки</div>
        <LinksEditor
          :links="task.links"
          @change="(links) => patchTask({ links })"
        />
      </div>

      <n-divider>Подзадачи рабочих групп</n-divider>

      <n-empty
        v-if="subtasks.length === 0"
        size="small"
        description="Пока нет подзадач"
        class="py-4"
      />

      <div class="flex flex-col gap-2">
        <div
          v-for="sub in subtasks"
          :key="sub.id"
          class="rounded-lg border px-3 py-2"
          :class="
            burningIds.has(sub.id)
              ? 'border-red-500/60 bg-red-500/10'
              : 'border-edge bg-ink'
          "
        >
          <div class="flex items-center gap-2">
            <span
              class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              :style="{ background: TRACK_COLORS[sub.track] }"
            />
            <span class="flex-1 truncate text-sm">{{ sub.title }}</span>
            <n-tag
              v-if="burningIds.has(sub.id)"
              size="small"
              type="error"
              :bordered="false"
              >🔥 горит</n-tag
            >
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <n-select
              size="tiny"
              :value="sub.track"
              :options="trackOptions"
              style="width: 130px"
              @update:value="(v: Track) => patchSubtask(sub, { track: v })"
            />
            <n-select
              size="tiny"
              :value="sub.status"
              :options="statusOptions"
              style="width: 150px"
              @update:value="(v: Status) => patchSubtask(sub, { status: v })"
            />
            <n-input-number
              size="tiny"
              :value="sub.estimateHours"
              :min="0"
              style="width: 90px"
              @update:value="(v) => patchSubtask(sub, { estimateHours: v || 0 })"
            >
              <template #suffix>ч</template>
            </n-input-number>
            <n-input-number
              size="tiny"
              :value="sub.deadlineDays"
              :min="1"
              :placeholder="String(sprintDeadline)"
              style="width: 110px"
              @update:value="(v) => patchSubtask(sub, { deadlineDays: v })"
            >
              <template #suffix>дн</template>
            </n-input-number>
            <span
              v-if="sub.status === 'in_progress'"
              class="text-xs text-slate-500"
              >дедлайн {{ effectiveDeadline(sub) }}д</span
            >
            <n-select
              size="tiny"
              :value="sub.assigneeId"
              :options="assigneeOptions"
              placeholder="исполнитель"
              style="width: 150px"
              @update:value="(v: string | null) => patchSubtask(sub, { assigneeId: v })"
            />
            <n-popconfirm @positive-click="() => deleteSubtask(sub)">
              <template #trigger>
                <n-button size="tiny" text type="error">✕</n-button>
              </template>
              Удалить подзадачу?
            </n-popconfirm>
          </div>
          <div class="mt-2">
            <LinksEditor
              compact
              :links="sub.links"
              @change="(links) => patchSubtask(sub, { links })"
            />
          </div>
        </div>
      </div>

      <!-- Add subtask -->
      <div class="mt-4 rounded-lg border border-edge bg-panel/40 p-3">
        <div class="mb-2 text-xs font-medium text-slate-400">
          Добавить подзадачу
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <n-input
            v-model:value="subTitle"
            size="small"
            placeholder="Что нужно сделать"
            style="flex: 1 1 200px"
            @keyup.enter="addSubtask"
          />
          <n-select
            v-model:value="subTrack"
            size="small"
            :options="trackOptions"
            style="width: 130px"
          />
          <n-input-number
            v-model:value="subEstimate"
            size="small"
            :min="0"
            placeholder="часы"
            style="width: 90px"
          />
          <n-input-number
            v-model:value="subDeadline"
            size="small"
            :min="1"
            placeholder="дедлайн"
            style="width: 110px"
          />
          <n-select
            v-model:value="subAssignee"
            size="small"
            :options="assigneeOptions"
            placeholder="исполнитель"
            style="width: 150px"
          />
          <n-button
            size="small"
            type="primary"
            :loading="adding"
            @click="addSubtask"
            >Добавить</n-button
          >
        </div>
      </div>
    </template>
  </n-modal>
</template>
