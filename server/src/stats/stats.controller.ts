import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@UseGuards(AuthGuard)
@Controller()
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('sprints/:sprintId/stats')
  forSprint(
    @CurrentUser() userId: string,
    @Param('sprintId') sprintId: string,
  ) {
    return this.stats.forSprint(userId, sprintId);
  }

  @Get('sprints/:sprintId/performance')
  performance(
    @CurrentUser() userId: string,
    @Param('sprintId') sprintId: string,
  ) {
    return this.stats.performanceForSprint(userId, sprintId);
  }
}
