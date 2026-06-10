import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubtasksService } from './subtasks.service';
import { SubtasksController } from './subtasks.controller';
import { Subtask } from '../entities/subtask.entity';
import { Task } from '../entities/task.entity';
import { SprintsModule } from '../sprints/sprints.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subtask, Task]), SprintsModule],
  controllers: [SubtasksController],
  providers: [SubtasksService],
})
export class SubtasksModule {}
