import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { SubtasksService } from './subtasks.service';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { SubtaskStatus, SubtaskTrack } from '../entities/subtask.entity';

const TRACKS = [
  'analytics',
  'backend',
  'frontend',
  'testing',
  'devops',
  'other',
];
const STATUSES = ['todo', 'in_progress', 'done'];

class CreateSubtaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsIn(TRACKS)
  track?: SubtaskTrack;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  deadlineDays?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  links?: string[];

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;
}

class UpdateSubtaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsIn(TRACKS)
  track?: SubtaskTrack;

  @IsOptional()
  @IsIn(STATUSES)
  status?: SubtaskStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  deadlineDays?: number | null;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  links?: string[];

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;
}

@UseGuards(AuthGuard)
@Controller()
export class SubtasksController {
  constructor(private readonly subtasks: SubtasksService) {}

  @Post('tasks/:taskId/subtasks')
  create(
    @CurrentUser() userId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateSubtaskDto,
  ) {
    return this.subtasks.create(userId, taskId, dto);
  }

  @Patch('subtasks/:id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubtaskDto,
  ) {
    return this.subtasks.update(userId, id, dto);
  }

  @Delete('subtasks/:id')
  async remove(@CurrentUser() userId: string, @Param('id') id: string) {
    await this.subtasks.remove(userId, id);
    return { ok: true };
  }
}
