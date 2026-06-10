import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { Sprint } from '../entities/sprint.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(Sprint)
    private readonly sprints: Repository<Sprint>,
  ) {}

  /** Projects the user owns or has access to through a shared sprint. */
  async listForUser(userId: string): Promise<Project[]> {
    const owned = await this.projects.find({ where: { ownerId: userId } });

    const sharedRows = await this.sprints
      .createQueryBuilder('sprint')
      .select('DISTINCT sprint.projectId', 'projectId')
      .innerJoin('sprint_members', 'm', 'm.sprintId = sprint.id')
      .where('m.userId = :userId', { userId })
      .getRawMany<{ projectId: string }>();

    const ownedIds = new Set(owned.map((p) => p.id));
    const sharedIds = sharedRows
      .map((r) => r.projectId)
      .filter((id) => !ownedIds.has(id));

    const shared = sharedIds.length
      ? await this.projects.find({ where: { id: In(sharedIds) } })
      : [];

    return [...owned, ...shared].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async create(userId: string, name: string): Promise<Project> {
    const project = this.projects.create({ name: name.trim(), ownerId: userId });
    return this.projects.save(project);
  }

  async getOneForUser(userId: string, projectId: string): Promise<Project> {
    await this.assertAccess(userId, projectId);
    return this.projects.findOneOrFail({ where: { id: projectId } });
  }

  async remove(userId: string, projectId: string): Promise<void> {
    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete a project');
    }
    await this.projects.remove(project);
  }

  /** Owner, or a member of at least one sprint in the project. */
  async assertAccess(userId: string, projectId: string): Promise<Project> {
    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId === userId) return project;

    const memberCount = await this.sprints
      .createQueryBuilder('sprint')
      .innerJoin('sprint_members', 'm', 'm.sprintId = sprint.id')
      .where('sprint.projectId = :projectId', { projectId })
      .andWhere('m.userId = :userId', { userId })
      .getCount();

    if (memberCount === 0) {
      throw new ForbiddenException('No access to this project');
    }
    return project;
  }
}
