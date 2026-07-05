import {
  Column, CreateDateColumn, Entity, Index,
  ManyToOne, PrimaryGeneratedColumn, JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";

export enum CoinTransactionType {
  PURCHASE = "purchase",
  UNLOCK   = "unlock",
  BONUS    = "bonus",
  REFUND   = "refund",
}

@Entity("coin_transactions")
export class CoinTransactionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => UserEntity, (u) => u.coinTransactions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  @Index()
  user!: UserEntity;

  @Column({ type: "enum", enum: CoinTransactionType })
  type!: CoinTransactionType;

  @Column({ type: "int" })
  amount!: number;

  @Column({ name: "balance_after", type: "int" })
  balanceAfter!: number;

  @Column({ nullable: true, type: "text" })
  description?: string;

  @Column({ name: "chapter_id", type: "uuid", nullable: true })
  chapterId?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  @Index()
  createdAt!: Date;
}
