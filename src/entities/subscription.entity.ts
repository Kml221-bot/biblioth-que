import {
  Column, CreateDateColumn, Entity, Index,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";

export enum SubscriptionPlan {
  FREE              = "free",
  STUDENT           = "student",
  PREMIUM           = "premium",
  SCHOOL            = "school",
  PACK_INFORMATIQUE = "pack_informatique",
  PACK_DROIT        = "pack_droit",
}

export enum SubscriptionStatus {
  ACTIVE   = "active",
  EXPIRED  = "expired",
  CANCELED = "canceled",
  PENDING  = "pending",
}

@Entity("subscriptions")
export class SubscriptionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => UserEntity, (u) => u.subscriptions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  @Index()
  user!: UserEntity;

  @Column({ type: "enum", enum: SubscriptionPlan, default: SubscriptionPlan.FREE })
  plan!: SubscriptionPlan;

  @Column({ type: 'text', default: "active" })
  status!: string;

  @Column({ type: 'int', name: "emprunts_restants", default: 3 })
  empruntsRestants!: number;

  @Column({ type: 'boolean', name: "auto_renew", default: false })
  autoRenew!: boolean;

  @Column({ name: "starts_at", type: "timestamptz", default: () => "NOW()" })
  startsAt!: Date;

  @Column({ name: "ends_at", type: "timestamptz", nullable: true })
  endsAt?: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
