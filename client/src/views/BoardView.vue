<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  NButton,
  NModal,
  NInput,
  NInputNumber,
  NSelect,
  NTag,
  NSpin,
  NFormItem,
  NCollapseTransition,
  useMessage,
} from 'naive-ui';
import TopBar from '../components/TopBar.vue';
import Gauge from '../components/Gauge.vue';
import TaskDetailModal from '../components/TaskDetailModal.vue';
import InviteModal from '../components/InviteModal.vue';
import { api, ApiError } from '../api/client';
import {
  type Task,
  type Subtask,
  type Sprint,
  type Stats,
  type Status,
  type Track,
  type TeamMember,
  type PerformanceRow,
  STATUS_LABELS,
  TRACK_LABELS,
  TRACK_COLORS,
} from '../api/types';

const props = defineProps<{ sprintId: string }>();
const message = useMessage();

const sprint = ref<Sprint | null>(null);
const tasks = ref<Task[]>([]);
const stats = ref<Stats | null>(null);
const team = ref<TeamMember[]>([]);
const performance = ref<PerformanceRow[]>([]);
const loading = ref(true);

const COLUMNS: Status[] = ['todo', 'in_progress', 'done'];

// ---- Filter & sort ----
const statusFilter = ref<Status[]>(['todo', 'in_progress', 'done']);
const sortDir = ref<'forward' | 'reverse'>('forward');
const statusOrderForward: Status[] = ['in_progress', 'todo', 'done'];

const statusFilterOptions = COLUMNS.map((s) => ({
  label: STATUS_LABELS[s],
  value: s,
}));
const sortOptions = [
  { label: 'Статус: в работе → выполнено', value: 'forward' },
  { label: 'Статус: выполнено → в работе', value: 'reverse' },
];

const columns = computed(() => {
  const order =
    sortDir.value === 'forward'
      ? statusOrderForward
      : [...statusOrderForward].reverse();
  return order
    .filter((status) => statusFilter.value.includes(status))
    .map((status) => ({
      status,
      label: STATUS_LABELS[status],
      // Within one status, order by factual completion %, then position.
      items: tasks.value
        .filter((t) => t.status === status)
        .sort(
          (a, b) =>
            taskPercent(b) - taskPercent(a) || a.position - b.position,
        ),
    }));
});

const burningIds = computed(
  () => new Set((stats.value?.burning ?? []).map((b) => b.id)),
);

function taskBurning(task: Task): boolean {
  return task.subtasks.some((s) => burningIds.value.has(s.id));
}

function subtaskProgress(task: Task): string {
  const done = task.subtasks.filter((s) => s.status === 'done').length;
  return `${done}/${task.subtasks.length}`;
}

function taskPercent(task: Task): number {
  return stats.value?.taskProgress[task.id] ?? 0;
}

/** Distinct assignees across a task's subtasks (for the board card). */
function taskAssignees(task: Task): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const s of task.subtasks) {
    if (s.assignee)
      seen.set(s.assignee.id, `${s.assignee.firstName} ${s.assignee.lastName}`.trim());
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

// ---- Track drill-down (same page, animated) ----
const selectedTrack = ref<Track | null>(null);
function toggleTrack(track: Track) {
  selectedTrack.value = selectedTrack.value === track ? null : track;
}
const selectedTrackStat = computed(
  () => stats.value?.tracks.find((t) => t.track === selectedTrack.value) ?? null,
);
const trackColumns = computed(() => {
  const t = selectedTrack.value;
  const flat: { sub: Subtask; taskTitle: string }[] = [];
  if (t) {
    for (const task of tasks.value)
      for (const s of task.subtasks)
        if (s.track === t) flat.push({ sub: s, taskTitle: task.title });
  }
  return COLUMNS.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    items: flat.filter((f) => f.sub.status === status),
  }));
});

// subtask drag & drop inside the track panel
const draggedSubId = ref<string | null>(null);
const subDragOver = ref<Status | null>(null);
function onSubDragStart(s: Subtask) {
  draggedSubId.value = s.id;
}
function onSubDragEnd() {
  draggedSubId.value = null;
  subDragOver.value = null;
}
function onSubDragOver(status: Status, ev: DragEvent) {
  ev.preventDefault();
  subDragOver.value = status;
}
async function onSubDrop(status: Status) {
  const id = draggedSubId.value;
  subDragOver.value = null;
  draggedSubId.value = null;
  if (!id) return;
  let target: Subtask | undefined;
  for (const t of tasks.value) {
    const f = t.subtasks.find((s) => s.id === id);
    if (f) {
      target = f;
      break;
    }
  }
  if (!target || target.status === status) return;
  target.status = status; // optimistic
  try {
    await api.patch(`/subtasks/${id}`, { status });
    await refresh();
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
    await refresh();
  }
}

async function load() {
  loading.value = true;
  try {
    [sprint.value, tasks.value, stats.value, team.value, performance.value] =
      await Promise.all([
        api.get<Sprint>(`/sprints/${props.sprintId}`),
        api.get<Task[]>(`/sprints/${props.sprintId}/tasks`),
        api.get<Stats>(`/sprints/${props.sprintId}/stats`),
        api.get<TeamMember[]>('/team'),
        api.get<PerformanceRow[]>(`/sprints/${props.sprintId}/performance`),
      ]);
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка загрузки');
  } finally {
    loading.value = false;
  }
}

async function refresh() {
  try {
    [tasks.value, stats.value, performance.value] = await Promise.all([
      api.get<Task[]>(`/sprints/${props.sprintId}/tasks`),
      api.get<Stats>(`/sprints/${props.sprintId}/stats`),
      api.get<PerformanceRow[]>(`/sprints/${props.sprintId}/performance`),
    ]);
    // keep the open task modal in sync
    if (selectedTask.value) {
      selectedTask.value =
        tasks.value.find((t) => t.id === selectedTask.value!.id) ?? null;
    }
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  }
}

// ---- Drag & drop ----
const draggedId = ref<string | null>(null);
const dragOverStatus = ref<Status | null>(null);

function onDragStart(task: Task) {
  draggedId.value = task.id;
}
function onDragEnd() {
  draggedId.value = null;
  dragOverStatus.value = null;
}
function onDragOver(status: Status, ev: DragEvent) {
  ev.preventDefault();
  dragOverStatus.value = status;
}
async function onDrop(status: Status) {
  const id = draggedId.value;
  dragOverStatus.value = null;
  draggedId.value = null;
  if (!id) return;
  const task = tasks.value.find((t) => t.id === id);
  if (!task || task.status === status) return;
  task.status = status; // optimistic
  try {
    await api.patch(`/tasks/${id}`, { status });
    await refresh();
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
    await refresh();
  }
}

// ---- Task detail ----
const selectedTask = ref<Task | null>(null);
const showDetail = ref(false);
function openTask(task: Task) {
  selectedTask.value = task;
  showDetail.value = true;
}

// ---- Create task ----
const showCreate = ref(false);
const newTitle = ref('');
const newDesc = ref('');
const newEstimate = ref<number>(0);
const creating = ref(false);
async function createTask() {
  if (!newTitle.value.trim()) return;
  creating.value = true;
  try {
    await api.post(`/sprints/${props.sprintId}/tasks`, {
      title: newTitle.value,
      description: newDesc.value || undefined,
      estimateHours: newEstimate.value || 0,
    });
    showCreate.value = false;
    newTitle.value = '';
    newDesc.value = '';
    newEstimate.value = 0;
    await refresh();
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  } finally {
    creating.value = false;
  }
}

// ---- Invite + settings ----
const showInvite = ref(false);
const showSettings = ref(false);
const deadlineDraft = ref<number>(5);
function openSettings() {
  deadlineDraft.value = sprint.value?.deadlineDays ?? 5;
  showSettings.value = true;
}
async function saveSettings() {
  try {
    sprint.value = await api.patch<Sprint>(`/sprints/${props.sprintId}`, {
      deadlineDays: deadlineDraft.value,
    });
    showSettings.value = false;
    await refresh();
  } catch (e) {
    message.error(e instanceof ApiError ? e.message : 'Ошибка');
  }
}

const breadcrumb = computed(() => {
  const crumbs: { label: string; to?: string }[] = [];
  if (sprint.value)
    crumbs.push({
      label: 'Спринты',
      to: `/projects/${sprint.value.projectId}`,
    });
  crumbs.push({ label: sprint.value?.name || '…' });
  return crumbs;
});

onMounted(load);
</script>

<template>
  <div class="flex h-full flex-col">
    <TopBar :breadcrumb="breadcrumb" />

    <n-spin :show="loading" class="flex-1 overflow-auto">
      <main class="mx-auto w-full max-w-7xl p-5">
        <!-- Action bar -->
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <h1 class="text-xl font-semibold">{{ sprint?.name }}</h1>
          <n-tag size="small" type="warning" :bordered="false"
            >дедлайн {{ sprint?.deadlineDays }}д</n-tag
          >
          <div class="ml-auto flex gap-2">
            <n-button size="small" @click="openSettings">⚙ Дедлайн</n-button>
            <n-button size="small" @click="showInvite = true"
              >👥 Участники</n-button
            >
            <n-button size="small" type="primary" @click="showCreate = true"
              >+ Задача</n-button
            >
          </div>
        </div>

        <!-- Filter & sort -->
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">Фильтр статуса</span>
            <n-select
              v-model:value="statusFilter"
              multiple
              size="small"
              :options="statusFilterOptions"
              style="min-width: 260px"
              placeholder="Все статусы"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">Сортировка</span>
            <n-select
              v-model:value="sortDir"
              size="small"
              :options="sortOptions"
              style="min-width: 240px"
            />
          </div>
        </div>

        <!-- Dashboards -->
        <div
          v-if="stats"
          class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]"
        >
          <!-- Overall -->
          <div
            class="flex flex-col items-center justify-center rounded-xl border border-edge bg-panel/50 p-4"
          >
            <Gauge
              :percentage="stats.overall.percentDone"
              :size="170"
              label="Задачи спринта"
              :sublabel="`${stats.overall.doneTasks} из ${stats.overall.totalTasks} закрыто`"
            />
            <div class="mt-3 grid w-full grid-cols-3 gap-2 text-center">
              <div class="rounded-lg bg-ink p-2" title="Ручная оценка задач">
                <div class="text-base font-semibold text-slate-200">
                  {{ stats.overall.plannedHours }}ч
                </div>
                <div class="text-[11px] text-slate-400">план</div>
              </div>
              <div
                class="rounded-lg bg-ink p-2"
                title="Сумма оценок всех подзадач"
              >
                <div class="text-base font-semibold text-sky-300">
                  {{ stats.overall.actualHours }}ч
                </div>
                <div class="text-[11px] text-slate-400">факт Σ</div>
              </div>
              <div class="rounded-lg bg-ink p-2" title="Незакрытые подзадачи">
                <div class="text-base font-semibold text-amber-400">
                  {{ stats.overall.actualRemainingHours }}ч
                </div>
                <div class="text-[11px] text-slate-400">осталось</div>
              </div>
            </div>
          </div>

          <!-- Per-track gauges -->
          <div class="rounded-xl border border-edge bg-panel/50 p-4">
            <div class="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
              Рабочие группы
              <span class="text-xs font-normal text-slate-500"
                >— нажмите на группу, чтобы раскрыть её доску</span
              >
            </div>
            <div
              v-if="stats.tracks.length"
              class="flex flex-wrap items-start gap-3"
            >
              <button
                v-for="t in stats.tracks"
                :key="t.track"
                class="flex flex-col items-center rounded-xl border px-3 py-2 outline-none transition-all hover:-translate-y-0.5"
                :class="
                  selectedTrack === t.track
                    ? 'border-slate-400 bg-ink shadow-lg'
                    : 'border-transparent hover:border-slate-500 hover:bg-ink/70 focus-visible:border-slate-500'
                "
                @click="toggleTrack(t.track)"
              >
                <Gauge
                  :percentage="t.percentDone"
                  :size="120"
                  :color="TRACK_COLORS[t.track]"
                  :label="TRACK_LABELS[t.track]"
                  :sublabel="`${t.done}/${t.total}`"
                />
                <n-tag
                  v-if="t.burning > 0"
                  size="small"
                  type="error"
                  :bordered="false"
                  class="mt-1"
                  >🔥 {{ t.burning }} горит</n-tag
                >
              </button>
            </div>
            <div v-else class="py-8 text-center text-sm text-slate-500">
              Добавьте подзадачи в задачи — здесь появятся спидометры групп
            </div>
          </div>
        </div>

        <!-- Track drill-down (same page, animated) -->
        <n-collapse-transition :show="!!selectedTrack">
          <div
            v-if="selectedTrack && selectedTrackStat"
            class="mb-5 rounded-xl border bg-panel/50 p-4"
            :style="{ borderColor: TRACK_COLORS[selectedTrack] + '66' }"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div class="flex items-center gap-4">
                <Gauge
                  :percentage="selectedTrackStat.percentDone"
                  :size="130"
                  :color="TRACK_COLORS[selectedTrack]"
                  :sublabel="`${selectedTrackStat.done}/${selectedTrackStat.total}`"
                />
                <div>
                  <div class="flex items-center gap-2 text-lg font-semibold">
                    <span
                      class="inline-block h-3 w-3 rounded-full"
                      :style="{ background: TRACK_COLORS[selectedTrack] }"
                    />
                    {{ TRACK_LABELS[selectedTrack] }}
                  </div>
                  <div class="mt-1 text-sm text-slate-400">
                    {{ selectedTrackStat.doneHours }} / {{ selectedTrackStat.hours }} ч
                    выполнено
                  </div>
                  <div
                    v-if="selectedTrackStat.burning"
                    class="mt-1 text-sm text-red-300"
                  >
                    🔥 {{ selectedTrackStat.burning }} горящих
                  </div>
                </div>
              </div>
              <n-button
                class="lg:ml-auto"
                size="small"
                quaternary
                @click="selectedTrack = null"
                >Свернуть ✕</n-button
              >
            </div>

            <!-- Mini-board of this track's subtasks -->
            <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div
                v-for="col in trackColumns"
                :key="col.status"
                class="flex flex-col rounded-lg border border-edge bg-ink/60 p-2.5"
                :class="{ 'drop-active': subDragOver === col.status }"
                @dragover="onSubDragOver(col.status, $event)"
                @dragleave="subDragOver = null"
                @drop="onSubDrop(col.status)"
              >
                <div class="mb-2 flex items-center justify-between px-1">
                  <span class="text-xs font-medium text-slate-300">{{
                    col.label
                  }}</span>
                  <span class="text-xs text-slate-500">{{
                    col.items.length
                  }}</span>
                </div>
                <div class="flex min-h-[48px] flex-col gap-2">
                  <div
                    v-for="{ sub, taskTitle } in col.items"
                    :key="sub.id"
                    draggable="true"
                    class="cursor-grab rounded-md border bg-panel/70 p-2 text-sm transition active:cursor-grabbing"
                    :class="[
                      burningIds.has(sub.id)
                        ? 'border-red-500/60'
                        : 'border-edge hover:border-slate-500',
                      draggedSubId === sub.id ? 'dragging' : '',
                    ]"
                    @dragstart="onSubDragStart(sub)"
                    @dragend="onSubDragEnd"
                  >
                    <div class="flex items-start gap-1">
                      <span class="flex-1">{{ sub.title }}</span>
                      <span v-if="burningIds.has(sub.id)">🔥</span>
                    </div>
                    <div class="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span class="truncate">{{ taskTitle }}</span>
                      <span v-if="sub.estimateHours" class="shrink-0"
                        >· {{ sub.estimateHours }}ч</span
                      >
                      <span v-if="sub.links?.length" class="shrink-0">🔗</span>
                    </div>
                    <div
                      v-if="sub.assignee"
                      class="mt-1 text-xs text-slate-300"
                    >
                      👤 {{ sub.assignee.firstName }} {{ sub.assignee.lastName }}
                    </div>
                  </div>
                  <div
                    v-if="col.items.length === 0"
                    class="grid place-items-center rounded-md border border-dashed border-edge py-4 text-xs text-slate-600"
                  >
                    перетащите сюда
                  </div>
                </div>
              </div>
            </div>
          </div>
        </n-collapse-transition>

        <!-- Burning panel -->
        <div
          v-if="stats && stats.burning.length"
          class="mb-5 rounded-xl border border-red-500/40 bg-red-500/5 p-4"
        >
          <div class="mb-2 text-sm font-medium text-red-300">
            🔥 Горящие подзадачи ({{ stats.burning.length }})
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="b in stats.burning"
              :key="b.id"
              class="rounded-lg border border-red-500/40 bg-ink px-3 py-1.5 text-xs"
            >
              <span class="font-medium">{{ b.title }}</span>
              <span class="text-slate-500"> · {{ b.taskTitle }}</span>
              <span class="ml-1 text-red-300"
                >{{ b.daysInProgress }}д / лимит {{ b.deadlineDays }}д</span
              >
            </div>
          </div>
        </div>

        <!-- Team performance -->
        <div
          v-if="performance.length"
          class="mb-5 rounded-xl border border-edge bg-panel/50 p-4"
        >
          <div class="mb-3 text-sm font-medium text-slate-300">
            Производительность команды
          </div>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="row in performance"
              :key="row.assignee?.id || 'none'"
              class="flex items-center justify-between rounded-lg bg-ink px-3 py-2"
            >
              <div class="min-w-0">
                <div class="truncate text-sm font-medium">
                  {{
                    row.assignee
                      ? `${row.assignee.firstName} ${row.assignee.lastName}`.trim()
                      : 'Не назначен'
                  }}
                </div>
                <div class="text-xs text-slate-500">
                  выполнено {{ row.subtasksDone }} из
                  {{ row.subtasksTotal }} подзадач
                </div>
              </div>
              <div class="ml-2 shrink-0 text-right">
                <div class="text-base font-semibold text-emerald-400">
                  {{ row.hoursDone }}ч
                </div>
                <div class="text-[10px] text-slate-500">
                  из {{ row.hoursTotal }}ч
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Board columns -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div
            v-for="col in columns"
            :key="col.status"
            class="flex flex-col rounded-xl border border-edge bg-panel/40 p-3"
            :class="{ 'drop-active': dragOverStatus === col.status }"
            @dragover="onDragOver(col.status, $event)"
            @dragleave="dragOverStatus = null"
            @drop="onDrop(col.status)"
          >
            <div class="mb-2 flex items-center justify-between px-1">
              <span class="text-sm font-medium text-slate-300">{{
                col.label
              }}</span>
              <span class="text-xs text-slate-500">{{ col.items.length }}</span>
            </div>

            <div class="flex min-h-[60px] flex-col gap-2">
              <div
                v-for="task in col.items"
                :key="task.id"
                draggable="true"
                class="cursor-grab rounded-lg border bg-ink p-3 transition active:cursor-grabbing"
                :class="[
                  taskBurning(task)
                    ? 'border-red-500/60'
                    : 'border-edge hover:border-slate-500',
                  draggedId === task.id ? 'dragging' : '',
                ]"
                @dragstart="onDragStart(task)"
                @dragend="onDragEnd"
                @click="openTask(task)"
              >
                <div class="flex items-start gap-2">
                  <span class="flex-1 text-sm font-medium">{{
                    task.title
                  }}</span>
                  <span v-if="taskBurning(task)" title="есть горящие подзадачи"
                    >🔥</span
                  >
                </div>
                <div class="mt-2 flex flex-wrap items-center gap-1.5">
                  <n-tag
                    v-if="task.estimateHours"
                    size="small"
                    :bordered="false"
                    >{{ task.estimateHours }}ч</n-tag
                  >
                  <n-tag
                    v-if="task.subtasks.length"
                    size="small"
                    :bordered="false"
                    type="info"
                    >☑ {{ subtaskProgress(task) }}</n-tag
                  >
                  <span v-if="task.links?.length" class="text-xs text-sky-300"
                    >🔗 {{ task.links.length }}</span
                  >
                  <n-tag
                    v-for="a in taskAssignees(task)"
                    :key="a.id"
                    size="small"
                    round
                    :bordered="false"
                    >👤 {{ a.name }}</n-tag
                  >
                  <!-- track dots -->
                  <span class="flex gap-1">
                    <span
                      v-for="s in task.subtasks"
                      :key="s.id"
                      class="inline-block h-2 w-2 rounded-full"
                      :style="{
                        background: TRACK_COLORS[s.track],
                        opacity: s.status === 'done' ? 0.35 : 1,
                      }"
                    />
                  </span>
                </div>
                <!-- factual progress (weighted by subtask hours) -->
                <div
                  v-if="task.status !== 'done' && taskPercent(task) > 0"
                  class="mt-2"
                >
                  <div class="h-1.5 overflow-hidden rounded-full bg-edge">
                    <div
                      class="h-full rounded-full bg-sky-400 transition-all"
                      :style="{ width: taskPercent(task) + '%' }"
                    />
                  </div>
                  <div class="mt-0.5 text-right text-[10px] text-slate-500">
                    {{ taskPercent(task) }}%
                  </div>
                </div>
              </div>

              <div
                v-if="col.items.length === 0"
                class="grid place-items-center rounded-lg border border-dashed border-edge py-6 text-xs text-slate-600"
              >
                перетащите сюда
              </div>
            </div>
          </div>
        </div>
      </main>
    </n-spin>

    <!-- Task detail -->
    <TaskDetailModal
      v-model:show="showDetail"
      :task="selectedTask"
      :sprint-deadline="sprint?.deadlineDays ?? 5"
      :burning-ids="burningIds"
      :team="team"
      @changed="refresh"
      @deleted="refresh"
    />

    <!-- Invite -->
    <InviteModal v-model:show="showInvite" :sprint-id="sprintId" />

    <!-- Create task -->
    <n-modal
      v-model:show="showCreate"
      preset="card"
      title="Новая задача"
      style="max-width: 480px"
    >
      <n-form-item label="Заголовок">
        <n-input v-model:value="newTitle" placeholder="Что нужно сделать" />
      </n-form-item>
      <n-form-item label="Описание">
        <n-input
          v-model:value="newDesc"
          type="textarea"
          :rows="2"
          placeholder="Необязательно"
        />
      </n-form-item>
      <n-form-item label="Оценка, часов">
        <n-input-number v-model:value="newEstimate" :min="0" class="w-full" />
      </n-form-item>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showCreate = false">Отмена</n-button>
          <n-button type="primary" :loading="creating" @click="createTask"
            >Создать</n-button
          >
        </div>
      </template>
    </n-modal>

    <!-- Deadline settings -->
    <n-modal
      v-model:show="showSettings"
      preset="card"
      title="Дедлайн спринта"
      style="max-width: 420px"
    >
      <n-form-item label="Дней до «горения» подзадачи по умолчанию">
        <n-input-number v-model:value="deadlineDraft" :min="1" class="w-full" />
      </n-form-item>
      <p class="text-xs text-slate-500">
        Действует для подзадач без персонального дедлайна. Подзадача начинает
        гореть, если находится «в работе» дольше этого срока.
      </p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showSettings = false">Отмена</n-button>
          <n-button type="primary" @click="saveSettings">Сохранить</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>
