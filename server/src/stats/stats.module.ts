import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { Task } from '../entities/task.entity';
import { SprintsModule } from '../sprints/sprints.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), SprintsModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
