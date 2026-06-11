import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { Sprint } from './entities/sprint.entity';
import { Task } from './entities/task.entity';
import { Subtask } from './entities/subtask.entity';
import { TeamMember } from './entities/team-member.entity';

import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { SprintsModule } from './sprints/sprints.module';
import { TasksModule } from './tasks/tasks.module';
import { SubtasksModule } from './subtasks/subtasks.module';
import { StatsModule } from './stats/stats.module';
import { TeamModule } from './team/team.module';

// DATA_DIR lets the SQLite file live on a persistent volume (e.g. Railway
// volume mounted at /data). Defaults to server/data for local runs.
const dataDir = process.env.DATA_DIR || join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}
const clientDist = join(__dirname, '..', '..', 'client', 'dist');

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      // Pure-JS SQLite (sql.js / WASM): kept in memory, persisted to this file.
      location: join(dataDir, 'sprinttraker.sqlite'),
      autoSave: true,
      entities: [User, Project, Sprint, Task, Subtask, TeamMember],
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: clientDist,
      exclude: ['/api/(.*)'],
    }),
    AuthModule,
    ProjectsModule,
    SprintsModule,
    TasksModule,
    SubtasksModule,
    StatsModule,
    TeamModule,
  ],
})
export class AppModule {}
