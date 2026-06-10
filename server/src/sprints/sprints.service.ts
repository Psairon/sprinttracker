import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sprint } from '../entities/sprint.entity';
import { User } from '../entities/user.entity';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class SprintsService {
  constructor(
    @InjectRepository(Sprint)
    private readonly sprints: Repository<Sprint>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly projectsService: ProjectsService,
  ) {}

  async listForProject(userId: string, projectId: string): Promise<Sprint[]> {
    const project = await this.projectsService.assertAccess(userId, projectId);
    const all = await this.sprints.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
    // The owner sees every sprint; others only those they belong to.
    if (project.ownerId === userId) return all;
    return all.filter((s) => s.members.some((m) => m.id === userId));
  }

  async create(
    userId: string,
    projectId: string,
    name: string,
    deadlineDays: number,
  ): Promise<Sprint> {
    await this.projectsService.assertAccess(userId, projectId);
    const creator = await this.users.findOneOrFail({ where: { id: userId } });
    const sprint = this.sprints.create({
      name: name.trim(),
      projectId,
      deadlineDays: deadlineDays ?? 5,
      createdById: userId,
      members: [creator],
    });
    return this.sprints.save(sprint);
  }

  /** Throws unless the user is a member of the sprint. Returns the sprint. */
  async assertAccess(userId: string, sprintId: string): Promise<Sprint> {
    const sprint = await this.sprints.findOne({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException('Sprint not found');
    if (!sprint.members.some((m) => m.id === userId)) {
      throw new ForbiddenException('No access to this sprint');
    }
    return sprint;
  }

  async getOne(userId: string, sprintId: string): Promise<Sprint> {
    return this.assertAccess(userId, sprintId);
  }

  async updateDeadline(
    userId: string,
    sprintId: string,
    deadlineDays: number,
  ): Promise<Sprint> {
    const sprint = await this.assertAccess(userId, sprintId);
    sprint.deadlineDays = deadlineDays;
    return this.sprints.save(sprint);
  }

  async invite(
    userId: string,
    sprintId: string,
    email: string,
  ): Promise<Sprint> {
    const sprint = await this.assertAccess(userId, sprintId);
    const invitee = await this.users.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!invitee) {
      throw new NotFoundException('No user with that email');
    }
    if (!sprint.members.some((m) => m.id === invitee.id)) {
      sprint.members.push(invitee);
      await this.sprints.save(sprint);
    }
    return sprint;
  }

  async members(userId: string, sprintId: string) {
    const sprint = await this.assertAccess(userId, sprintId);
    return sprint.members.map((m) => ({
      id: m.id,
      email: m.email,
      name: m.name,
      isCreator: m.id === sprint.createdById,
    }));
  }

  async removeMember(userId: string, sprintId: string, memberId: string) {
    const sprint = await this.assertAccess(userId, sprintId);
    if (memberId === sprint.createdById) {
      throw new ForbiddenException('Cannot remove the sprint creator');
    }
    sprint.members = sprint.members.filter((m) => m.id !== memberId);
    await this.sprints.save(sprint);
    return { ok: true };
  }
}
