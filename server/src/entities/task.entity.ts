import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sprint } from './sprint.entity';
import { Subtask } from './subtask.entity';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Preliminary (planned) estimate in hours, entered by hand. */
  @Column({ type: 'float', default: 0 })
  estimateHours: number;

  /** External resource URLs (opened in a new tab from the UI). */
  @Column({ type: 'simple-json', nullable: true })
  links: string[] | null;

  @Column({ type: 'varchar', default: 'todo' })
  status: TaskStatus;

  /** Ordering position within its status column. */
  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => Sprint, (sprint) => sprint.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sprintId' })
  sprint: Sprint;

  @Column()
  sprintId: string;

  @OneToMany(() => Subtask, (subtask) => subtask.task, { cascade: true })
  subtasks: Subtask[];

  @CreateDateColumn()
  createdAt: Date;
}
