import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { SprintsService } from './sprints.service';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

class CreateSprintDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  deadlineDays?: number;
}

class UpdateSprintDto {
  @IsInt()
  @Min(1)
  deadlineDays: number;
}

class InviteDto {
  @IsEmail()
  email: string;
}

@UseGuards(AuthGuard)
@Controller()
export class SprintsController {
  constructor(private readonly sprints: SprintsService) {}

  @Get('projects/:projectId/sprints')
  list(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.sprints.listForProject(userId, projectId);
  }

  @Post('projects/:projectId/sprints')
  create(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateSprintDto,
  ) {
    return this.sprints.create(
      userId,
      projectId,
      dto.name,
      dto.deadlineDays ?? 5,
    );
  }

  @Get('sprints/:id')
  getOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.sprints.getOne(userId, id);
  }

  @Patch('sprints/:id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSprintDto,
  ) {
    return this.sprints.updateDeadline(userId, id, dto.deadlineDays);
  }

  @Get('sprints/:id/members')
  members(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.sprints.members(userId, id);
  }

  @Post('sprints/:id/invite')
  invite(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: InviteDto,
  ) {
    return this.sprints.invite(userId, id, dto.email);
  }

  @Delete('sprints/:id/members/:memberId')
  removeMember(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.sprints.removeMember(userId, id, memberId);
  }
}
