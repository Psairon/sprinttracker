import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { TeamMember } from './team-member.entity';

export type SubtaskStatus = 'todo' | 'in_progress' | 'done';
export type SubtaskTrack =
  | 'analytics'
  | 'backend'
  | 'frontend'
  | 'testing'
  | 'devops'
  | 'other';

@Entity('subtasks')
export class Subtask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'varchar', default: 'analytics' })
  track: SubtaskTrack;

  @Column({ type: 'varchar', default: 'todo' })
  status: SubtaskStatus;

  @Column({ type: 'float', default: 0 })
  estimateHours: number;

  /** External resource URLs (opened in a new tab from the UI). */
  @Column({ type: 'simple-json', nullable: true })
  links: string[] | null;

  /** Personal deadline override (in days). Falls back to the sprint deadline when null. */
  @Column({ type: 'int', nullable: true })
  deadlineDays: number | null;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => Task, (task) => task.subtasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column()
  taskId: string;

  /** Assigned team member (from the owner's "My team"). */
  @ManyToOne(() => TeamMember, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee: TeamMember | null;

  @Column({ type: 'uuid', nullable: true })
  assigneeId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
