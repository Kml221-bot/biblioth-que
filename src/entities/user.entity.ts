import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { SubscriptionEntity } from "./subscription.entity";
import { BorrowEntity } from "./borrow.entity";
import { BookNoteEntity } from "./book-note.entity";
import { CoinTransactionEntity } from "./coin-transaction.entity";
import { UserChapterAccessEntity } from "./user-chapter-access.entity";
import { UserStatsEntity } from "./user-stats.entity";

export enum UserRole {
  STUDENT    = "user",
  AUTHOR     = "author",
  ADMIN      = "admin",
  SUPER_ADMIN = "super_admin",
}

export enum UserStatus {
  ACTIVE    = "active",
  SUSPENDED = "suspended",
  DELETED   = "deleted",
}

@Entity("profiles")
export class UserEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ type: 'text', name: "last_name", default: "" })
  nom!: string;

  @Column({ type: 'text', name: "first_name", nullable: true })
  prenom?: string;

  @Column({ type: 'text', name: "whatsapp_number", nullable: true })
  whatsappNumber?: string;

  @Column({ type: 'text', name: "avatar_url", nullable: true })
  avatarUrl?: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.STUDENT })
  @Index()
  role!: UserRole;

  @Column({ type: "enum", enum: UserStatus, default: UserStatus.ACTIVE })
  @Index()
  status!: UserStatus;

  @Column({ type: 'int', name: "coin_balance", default: 0 })
  coinBalance!: number;

  @Column({ type: 'text', name: "referral_code", nullable: true, unique: true })
  referralCode?: string;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => SubscriptionEntity, (s) => s.user)
  subscriptions!: SubscriptionEntity[];

  @OneToMany(() => BorrowEntity, (b) => b.user)
  borrows!: BorrowEntity[];

  @OneToMany(() => BookNoteEntity, (n) => n.user)
  notes!: BookNoteEntity[];

  @OneToMany(() => CoinTransactionEntity, (t) => t.user)
  coinTransactions!: CoinTransactionEntity[];

  @OneToMany(() => UserChapterAccessEntity, (a) => a.user)
  chapterAccesses!: UserChapterAccessEntity[];

  @OneToOne(() => UserStatsEntity, (s) => s.user)
  stats?: UserStatsEntity;
}
