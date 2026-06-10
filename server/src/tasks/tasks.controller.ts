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
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { TasksService } from './tasks.service';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { TaskStatus } from '../entities/task.entity';

class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateHours?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  links?: string[];
}

class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateHours?: number;

  @IsOptional()
  @IsIn(['todo', 'in_progress', 'done'])
  status?: TaskStatus;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  links?: string[];
}

@UseGuards(AuthGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('sprints/:sprintId/tasks')
  list(
    @CurrentUser() userId: string,
    @Param('sprintId') sprintId: string,
  ) {
    return this.tasks.listForSprint(userId, sprintId);
  }

  @Post('sprints/:sprintId/tasks')
  create(
    @CurrentUser() userId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(userId, sprintId, dto);
  }

  @Patch('tasks/:id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(userId, id, dto);
  }

  @Delete('tasks/:id')
  async remove(@CurrentUser() userId: string, @Param('id') id: string) {
    await this.tasks.remove(userId, id);
    return { ok: true };
  }
}
