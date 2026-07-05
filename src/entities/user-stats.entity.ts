import {
  Column, CreateDateColumn, Entity,
  OneToOne, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";

@Entity("user_stats")
export class UserStatsEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid", unique: true })
  userId!: string;

  @OneToOne(() => UserEntity, (u) => u.stats, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  @Column({ type: 'int', name: "livres_lus", default: 0 })
  livresLus!: number;

  @Column({ type: 'int', name: "pages_lues", default: 0 })
  pagesLues!: number;

  @Column({ type: 'int', name: "minutes_lecture", default: 0 })
  minutesLecture!: number;

  @Column({ type: 'int', name: "streak_jours", default: 0 })
  streakJours!: number;

  @Column({ type: 'int', name: "best_streak", default: 0 })
  bestStreak!: number;

  @Column({ type: 'int', default: 0 })
  xp!: number;

  @Column({ type: 'int', default: 1 })
  level!: number;

  @Column({ type: 'int', name: "biblio_coins", default: 0 })
  biblioCoins!: number;

  @Column({ type: 'int', name: "weekly_goal_minutes", default: 60 })
  weeklyGoalMinutes!: number;

  @Column({ name: "categories_favorites", type: "text", array: true, default: [] })
  categoriesFavorites!: string[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
