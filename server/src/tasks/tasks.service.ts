import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { SprintsService } from '../sprints/sprints.service';
import { applyStatusChange } from '../common/status.util';

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  estimateHours?: number;
  links?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  estimateHours?: number;
  status?: TaskStatus;
  position?: number;
  links?: string[];
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    private readonly sprintsService: SprintsService,
  ) {}

  async listForSprint(userId: string, sprintId: string): Promise<Task[]> {
    await this.sprintsService.assertAccess(userId, sprintId);
    return this.tasks.find({
      where: { sprintId },
      relations: { subtasks: true },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(
    userId: string,
    sprintId: string,
    input: CreateTaskInput,
  ): Promise<Task> {
    await this.sprintsService.assertAccess(userId, sprintId);
    const max = await this.tasks
      .createQueryBuilder('t')
      .select('MAX(t.position)', 'max')
      .where('t.sprintId = :sprintId', { sprintId })
      .getRawOne<{ max: number | null }>();
    const task = this.tasks.create({
      title: input.title.trim(),
      description: input.description ?? null,
      estimateHours: input.estimateHours ?? 0,
      links: input.links ?? [],
      sprintId,
      position: (max?.max ?? -1) + 1,
    });
    const saved = await this.tasks.save(task);
    return this.tasks.findOneOrFail({
      where: { id: saved.id },
      relations: { subtasks: true },
    });
  }

  async update(
    userId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<Task> {
    const task = await this.loadWithAccess(userId, taskId);
    if (input.title !== undefined) task.title = input.title.trim();
    if (input.description !== undefined) task.description = input.description;
    if (input.estimateHours !== undefined)
      task.estimateHours = input.estimateHours;
    if (input.position !== undefined) task.position = input.position;
    if (input.links !== undefined) task.links = input.links;
    if (input.status !== undefined) applyStatusChange(task, input.status);
    await this.tasks.save(task);
    return this.tasks.findOneOrFail({
      where: { id: task.id },
      relations: { subtasks: true },
    });
  }

  async remove(userId: string, taskId: string): Promise<void> {
    const task = await this.loadWithAccess(userId, taskId);
    await this.tasks.remove(task);
  }

  private async loadWithAccess(
    userId: string,
    taskId: string,
  ): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.sprintsService.assertAccess(userId, task.sprintId);
    return task;
  }
}
