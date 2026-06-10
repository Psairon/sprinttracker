export type Status = 'todo' | 'in_progress' | 'done';
export type Track =
  | 'analytics'
  | 'backend'
  | 'frontend'
  | 'testing'
  | 'devops'
  | 'other';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  deadlineDays: number;
  projectId: string;
  createdById: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  track: Track;
  status: Status;
  estimateHours: number;
  deadlineDays: number | null;
  links: string[] | null;
  position: number;
  startedAt: string | null;
  completedAt: string | null;
  taskId: string;
  assigneeId: string | null;
  assignee: TeamMember | null;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  estimateHours: number;
  links: string[] | null;
  status: Status;
  position: number;
  startedAt: string | null;
  completedAt: string | null;
  sprintId: string;
  createdAt: string;
  subtasks: Subtask[];
}

export type FeedbackState = 'given' | 'needs' | 'not_needed';
export type Satisfaction =
  | 'dissatisfied'
  | 'struggling'
  | 'meets'
  | 'good'
  | 'excellent';

export interface TeamMember {
  id: string;
  ownerId: string;
  firstName: string;
  lastName: string;
  specialization: string;
  vacationStart: string | null;
  vacationEnd: string | null;
  notes: string;
  feedback: FeedbackState;
  satisfaction: Satisfaction;
  createdAt: string;
}

export interface PerformanceRow {
  assignee: { id: string; firstName: string; lastName: string } | null;
  subtasksTotal: number;
  subtasksDone: number;
  hoursDone: number;
  hoursTotal: number;
}

export interface TrackStat {
  track: Track;
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  burning: number;
  hours: number;
  doneHours: number;
  percentDone: number;
}

export interface BurningSubtask {
  id: string;
  title: string;
  track: Track;
  taskId: string;
  taskTitle: string;
  daysInProgress: number;
  deadlineDays: number;
}

export interface Stats {
  sprint: { id: string; name: string; deadlineDays: number };
  overall: {
    totalTasks: number;
    doneTasks: number;
    percentDone: number;
    plannedHours: number;
    actualHours: number;
    plannedRemainingHours: number;
    actualRemainingHours: number;
  };
  taskProgress: Record<string, number>;
  tracks: TrackStat[];
  burning: BurningSubtask[];
}

export interface Member extends User {
  isCreator: boolean;
}

export const TRACK_LABELS: Record<Track, string> = {
  analytics: 'Аналитика',
  backend: 'Бэкенд',
  frontend: 'Фронтенд',
  testing: 'Тестирование',
  devops: 'DevOps',
  other: 'Прочее',
};

export const STATUS_LABELS: Record<Status, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Выполнено',
};

export const TRACK_COLORS: Record<Track, string> = {
  analytics: '#a78bfa',
  backend: '#34d399',
  frontend: '#60a5fa',
  testing: '#f472b6',
  devops: '#fbbf24',
  other: '#94a3b8',
};

export const FEEDBACK_LABELS: Record<FeedbackState, string> = {
  given: 'Дана',
  needs: 'Нуждается',
  not_needed: 'Не нужна',
};

export const FEEDBACK_TYPE: Record<FeedbackState, 'success' | 'warning' | 'default'> = {
  given: 'success',
  needs: 'warning',
  not_needed: 'default',
};

/** Satisfaction scale, ordered low → high, with emoji + colour. */
export const SATISFACTION_ORDER: Satisfaction[] = [
  'dissatisfied',
  'struggling',
  'meets',
  'good',
  'excellent',
];

export const SATISFACTION_META: Record<
  Satisfaction,
  { label: string; emoji: string; color: string }
> = {
  dissatisfied: { label: 'Не доволен', emoji: '😠', color: '#f87171' },
  struggling: { label: 'С трудом', emoji: '😟', color: '#fb923c' },
  meets: { label: 'Справляется', emoji: '🙂', color: '#fbbf24' },
  good: { label: 'Хорошо', emoji: '😀', color: '#a3e635' },
  excellent: { label: 'Справляется превосходно', emoji: '🤩', color: '#34d399' },
};
