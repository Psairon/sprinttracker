type Statusable = {
  status: 'todo' | 'in_progress' | 'done';
  startedAt: Date | null;
  completedAt: Date | null;
};

/**
 * Keeps startedAt / completedAt consistent with a status transition.
 * - First move into `in_progress` stamps startedAt (kept on later moves).
 * - Moving into `done` stamps completedAt; moving out of `done` clears it.
 */
export function applyStatusChange<T extends Statusable>(
  entity: T,
  next: T['status'],
): T {
  if (next === 'in_progress' && !entity.startedAt) {
    entity.startedAt = new Date();
  }
  if (next === 'done') {
    entity.completedAt = entity.completedAt ?? new Date();
  } else {
    entity.completedAt = null;
  }
  entity.status = next;
  return entity;
}
