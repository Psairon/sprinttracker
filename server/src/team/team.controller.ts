import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { TeamService } from './team.service';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import {
  FeedbackState,
  Satisfaction,
} from '../entities/team-member.entity';

const FEEDBACK = ['given', 'needs', 'not_needed'];
const SATISFACTION = [
  'dissatisfied',
  'struggling',
  'meets',
  'good',
  'excellent',
];

class UpsertMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  vacationStart?: string | null;

  @IsOptional()
  @IsString()
  vacationEnd?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(FEEDBACK)
  feedback?: FeedbackState;

  @IsOptional()
  @IsIn(SATISFACTION)
  satisfaction?: Satisfaction;
}

@UseGuards(AuthGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.team.list(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: UpsertMemberDto) {
    return this.team.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpsertMemberDto,
  ) {
    return this.team.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() userId: string, @Param('id') id: string) {
    await this.team.remove(userId, id);
    return { ok: true };
  }
}
