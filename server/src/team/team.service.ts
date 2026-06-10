import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';

export type TeamMemberInput = Partial<
  Omit<TeamMember, 'id' | 'owner' | 'ownerId' | 'createdAt'>
>;

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly members: Repository<TeamMember>,
  ) {}

  list(userId: string): Promise<TeamMember[]> {
    return this.members.find({
      where: { ownerId: userId },
      order: { createdAt: 'ASC' },
    });
  }

  create(userId: string, input: TeamMemberInput): Promise<TeamMember> {
    const member = this.members.create({
      ownerId: userId,
      firstName: (input.firstName ?? '').trim(),
      lastName: (input.lastName ?? '').trim(),
      specialization: (input.specialization ?? '').trim(),
      vacationStart: input.vacationStart ?? null,
      vacationEnd: input.vacationEnd ?? null,
      notes: input.notes ?? '',
      feedback: input.feedback ?? 'not_needed',
      satisfaction: input.satisfaction ?? 'meets',
    });
    return this.members.save(member);
  }

  async update(
    userId: string,
    id: string,
    input: TeamMemberInput,
  ): Promise<TeamMember> {
    const member = await this.loadOwned(userId, id);
    Object.assign(member, {
      ...input,
      firstName: input.firstName?.trim() ?? member.firstName,
      lastName: input.lastName?.trim() ?? member.lastName,
      specialization: input.specialization?.trim() ?? member.specialization,
    });
    return this.members.save(member);
  }

  async remove(userId: string, id: string): Promise<void> {
    const member = await this.loadOwned(userId, id);
    await this.members.remove(member);
  }

  private async loadOwned(userId: string, id: string): Promise<TeamMember> {
    const member = await this.members.findOne({ where: { id } });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.ownerId !== userId) {
      throw new ForbiddenException('Not your team member');
    }
    return member;
  }
}
