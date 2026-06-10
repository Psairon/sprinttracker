import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Subtask,
  SubtaskStatus,
  SubtaskTrack,
} from '../entities/subtask.entity';
import { Task } from '../entities/task.entity';
import { SprintsService } from '../sprints/sprints.service';
import { applyStatusChange } from '../common/status.util';

export interface CreateSubtaskInput {
  title: string;
  track?: SubtaskTrack;
  estimateHours?: number;
  deadlineDays?: number | null;
  links?: string[];
  assigneeId?: string | null;
}

export interface UpdateSubtaskInput {
  title?: string;
  track?: SubtaskTrack;
  status?: SubtaskStatus;
  estimateHours?: number;
  deadlineDays?: number | null;
  position?: number;
  links?: string[];
  assigneeId?: string | null;
}

@Injectable()
export class SubtasksService {
  constructor(
    @InjectRepository(Subtask)
    private readonly subtasks: Repository<Subtask>,
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    private readonly sprintsService: SprintsService,
  ) {}

  async create(
    userId: string,
    taskId: string,
    input: CreateSubtaskInput,
  ): Promise<Subtask> {
    await this.assertTaskAccess(userId, taskId);
    const max = await this.subtasks
      .createQueryBuilder('s')
      .select('MAX(s.position)', 'max')
      .where('s.taskId = :taskId', { taskId })
      .getRawOne<{ max: number | null }>();
    const subtask = this.subtasks.create({
      title: input.title.trim(),
      track: input.track ?? 'analytics',
      estimateHours: input.estimateHours ?? 0,
      deadlineDays: input.deadlineDays ?? null,
      links: input.links ?? [],
      assigneeId: input.assigneeId ?? null,
      taskId,
      position: (max?.max ?? -1) + 1,
    });
    return this.subtasks.save(subtask);
  }

  async update(
    userId: string,
    subtaskId: string,
    input: UpdateSubtaskInput,
  ): Promise<Subtask> {
    const subtask = await this.loadWithAccess(userId, subtaskId);
    if (input.title !== undefined) subtask.title = input.title.trim();
    if (input.track !== undefined) subtask.track = input.track;
    if (input.estimateHours !== undefined)
      subtask.estimateHours = input.estimateHours;
    if (input.deadlineDays !== undefined)
      subtask.deadlineDays = input.deadlineDays;
    if (input.position !== undefined) subtask.position = input.position;
    if (input.links !== undefined) subtask.links = input.links;
    if (input.assigneeId !== undefined) subtask.assigneeId = input.assigneeId;
    if (input.status !== undefined) applyStatusChange(subtask, input.status);
    return this.subtasks.save(subtask);
  }

  async remove(userId: string, subtaskId: string): Promise<void> {
    const subtask = await this.loadWithAccess(userId, subtaskId);
    await this.subtasks.remove(subtask);
  }

  private async assertTaskAccess(
    userId: string,
    taskId: string,
  ): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.sprintsService.assertAccess(userId, task.sprintId);
    return task;
  }

  private async loadWithAccess(
    userId: string,
    subtaskId: string,
  ): Promise<Subtask> {
    const subtask = await this.subtasks.findOne({
      where: { id: subtaskId },
      relations: { task: true },
    });
    if (!subtask) throw new NotFoundException('Subtask not found');
    await this.sprintsService.assertAccess(userId, subtask.task.sprintId);
    return subtask;
  }
}
