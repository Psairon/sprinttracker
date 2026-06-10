import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/** Whether feedback has been delivered to the member. */
export type FeedbackState = 'given' | 'needs' | 'not_needed';

/** Satisfaction with the member's work, ordered low → high. */
export type Satisfaction =
  | 'dissatisfied'
  | 'struggling'
  | 'meets'
  | 'good'
  | 'excellent';

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @Column()
  firstName: string;

  @Column({ default: '' })
  lastName: string;

  @Column({ default: '' })
  specialization: string;

  /** Nearest upcoming vacation (ISO date strings). */
  @Column({ type: 'date', nullable: true })
  vacationStart: string | null;

  @Column({ type: 'date', nullable: true })
  vacationEnd: string | null;

  @Column({ type: 'text', default: '' })
  notes: string;

  @Column({ type: 'varchar', default: 'not_needed' })
  feedback: FeedbackState;

  @Column({ type: 'varchar', default: 'meets' })
  satisfaction: Satisfaction;

  @CreateDateColumn()
  createdAt: Date;
}
