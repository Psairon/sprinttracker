import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { Subtask, SubtaskTrack } from '../entities/subtask.entity';
import { SprintsService } from '../sprints/sprints.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const TRACKS: SubtaskTrack[] = [
  'analytics',
  'backend',
  'frontend',
  'testing',
  'devops',
  'other',
];

export interface BurningSubtask {
  id: string;
  title: string;
  track: SubtaskTrack;
  taskId: string;
  taskTitle: string;
  daysInProgress: number;
  deadlineDays: number;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    private readonly sprintsService: SprintsService,
  ) {}

  async forSprint(userId: string, sprintId: string) {
    const sprint = await this.sprintsService.assertAccess(userId, sprintId);
    const tasks = await this.tasks.find({
      where: { sprintId },
      relations: { subtasks: true },
    });

    const overall = this.computeOverall(tasks);
    const taskProgress = this.computeTaskProgressMap(tasks);
    const { tracks, burning } = this.computeTracks(tasks, sprint.deadlineDays);

    return {
      sprint: {
        id: sprint.id,
        name: sprint.name,
        deadlineDays: sprint.deadlineDays,
      },
      overall,
      taskProgress,
      tracks,
      burning,
    };
  }

  /**
   * Per-assignee productivity within a sprint, based on SUBTASK assignments:
   * how many subtasks were completed and how many hours they account for.
   */
  async performanceForSprint(userId: string, sprintId: string) {
    await this.sprintsService.assertAccess(userId, sprintId);
    const tasks = await this.tasks.find({
      where: { sprintId },
      relations: { subtasks: { assignee: true } },
    });

    const rows = new Map<
      string,
      {
        assignee: { id: string; firstName: string; lastName: string } | null;
        subtasksTotal: number;
        subtasksDone: number;
        hoursDone: number;
        hoursTotal: number;
      }
    >();

    for (const task of tasks) {
      for (const sub of task.subtasks ?? []) {
        const key = sub.assigneeId ?? '__none__';
        if (!rows.has(key)) {
          rows.set(key, {
            assignee: sub.assignee
              ? {
                  id: sub.assignee.id,
                  firstName: sub.assignee.firstName,
                  lastName: sub.assignee.lastName,
                }
              : null,
            subtasksTotal: 0,
            subtasksDone: 0,
            hoursDone: 0,
            hoursTotal: 0,
          });
        }
        const row = rows.get(key)!;
        row.subtasksTotal += 1;
        row.hoursTotal += sub.estimateHours;
        if (sub.status === 'done') {
          row.subtasksDone += 1;
          row.hoursDone += sub.estimateHours;
        }
      }
    }

    return [...rows.values()]
      .map((r) => ({
        ...r,
        hoursDone: round(r.hoursDone),
        hoursTotal: round(r.hoursTotal),
      }))
      .sort(
        (a, b) => b.subtasksDone - a.subtasksDone || b.hoursDone - a.hoursDone,
      );
  }

  /**
   * Progress of a single task as a fraction (0..1), weighted by the hours of
   * its DONE subtasks vs all subtasks — so a task counts as partially complete
   * even before it is formally marked done. Falls back to status when there are
   * no subtasks (or no subtask estimates).
   */
  private taskProgress(task: Task): number {
    if (task.status === 'done') return 1;
    const subs = task.subtasks ?? [];
    if (subs.length === 0) return 0;
    const totalHours = sum(subs.map((s) => s.estimateHours));
    if (totalHours > 0) {
      const doneHours = sum(
        subs.filter((s) => s.status === 'done').map((s) => s.estimateHours),
      );
      return doneHours / totalHours;
    }
    // no estimates -> weight subtasks equally by count
    return subs.filter((s) => s.status === 'done').length / subs.length;
  }

  /** Weight used to combine task progress into the sprint gauge. */
  private taskWeight(task: Task): number {
    if (task.estimateHours > 0) return task.estimateHours;
    const subHours = sum((task.subtasks ?? []).map((s) => s.estimateHours));
    return subHours > 0 ? subHours : 1;
  }

  private computeOverall(tasks: Task[]) {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === 'done').length;

    // Planned = manual task estimates. Actual = sum of subtask estimates.
    const plannedHours = sum(tasks.map((t) => t.estimateHours));
    const actualHours = sum(
      tasks.map((t) => sum((t.subtasks ?? []).map((s) => s.estimateHours))),
    );

    // Weighted (factual) completion across the sprint.
    let weighted = 0;
    let weight = 0;
    let plannedRemaining = 0;
    let actualRemaining = 0;
    for (const t of tasks) {
      const p = this.taskProgress(t);
      const w = this.taskWeight(t);
      weighted += p * w;
      weight += w;
      plannedRemaining += t.estimateHours * (1 - p);
      actualRemaining += sum(
        (t.subtasks ?? [])
          .filter((s) => s.status !== 'done')
          .map((s) => s.estimateHours),
      );
    }

    return {
      totalTasks,
      doneTasks,
      percentDone: weight ? Math.round((weighted / weight) * 100) : 0,
      plannedHours: round(plannedHours),
      actualHours: round(actualHours),
      plannedRemainingHours: round(plannedRemaining),
      actualRemainingHours: round(actualRemaining),
    };
  }

  private computeTaskProgressMap(tasks: Task[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      map[t.id] = Math.round(this.taskProgress(t) * 100);
    }
    return map;
  }

  private computeTracks(tasks: Task[], sprintDeadline: number) {
    const now = Date.now();
    const byTrack = new Map<
      SubtaskTrack,
      {
        total: number;
        todo: number;
        inProgress: number;
        done: number;
        burning: number;
        hours: number;
        doneHours: number;
      }
    >();
    for (const track of TRACKS) {
      byTrack.set(track, {
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        burning: 0,
        hours: 0,
        doneHours: 0,
      });
    }

    const burning: BurningSubtask[] = [];

    for (const task of tasks) {
      for (const sub of task.subtasks ?? []) {
        const bucket = byTrack.get(sub.track) ?? byTrack.get('other')!;
        bucket.total += 1;
        bucket.hours += sub.estimateHours;
        if (sub.status === 'todo') bucket.todo += 1;
        else if (sub.status === 'in_progress') bucket.inProgress += 1;
        else if (sub.status === 'done') {
          bucket.done += 1;
          bucket.doneHours += sub.estimateHours;
        }

        if (sub.status === 'in_progress' && sub.startedAt) {
          const deadline = sub.deadlineDays ?? sprintDeadline;
          const days = (now - new Date(sub.startedAt).getTime()) / DAY_MS;
          if (days > deadline) {
            bucket.burning += 1;
            burning.push({
              id: sub.id,
              title: sub.title,
              track: sub.track,
              taskId: task.id,
              taskTitle: task.title,
              daysInProgress: Math.floor(days),
              deadlineDays: deadline,
            });
          }
        }
      }
    }

    const tracks = TRACKS.map((track) => {
      const b = byTrack.get(track)!;
      // Weighted by hours when available, else by subtask count.
      const percentDone =
        b.hours > 0
          ? Math.round((b.doneHours / b.hours) * 100)
          : b.total
            ? Math.round((b.done / b.total) * 100)
            : 0;
      return {
        track,
        total: b.total,
        todo: b.todo,
        inProgress: b.inProgress,
        done: b.done,
        burning: b.burning,
        hours: round(b.hours),
        doneHours: round(b.doneHours),
        percentDone,
      };
    }).filter((t) => t.total > 0);

    burning.sort((a, b) => b.daysInProgress - a.daysInProgress);

    return { tracks, burning };
  }
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + (v || 0), 0);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
