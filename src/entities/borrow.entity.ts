import {
  Column, CreateDateColumn, Entity, Index,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";
import { BookEntity } from "./book.entity";

export enum BorrowStatus {
  ACTIVE          = "actif",
  RENEWAL_PENDING = "prolonge",
  RETURNED        = "rendu",
  OVERDUE         = "retard",
  LOST            = "lost",
}

@Entity("borrows")
export class BorrowEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => UserEntity, (u) => u.borrows, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  @Index()
  user!: UserEntity;

  @Column({ name: "book_id", type: "uuid" })
  bookId!: string;

  @ManyToOne(() => BookEntity, (b) => b.borrows, { onDelete: "CASCADE" })
  @JoinColumn({ name: "book_id" })
  @Index()
  book!: BookEntity;

  @Column({ type: "enum", enum: BorrowStatus, default: BorrowStatus.ACTIVE })
  statut!: BorrowStatus;

  @Column({ type: "timestamptz", default: () => "NOW()" })
  debut!: Date;

  @Column({ name: "fin_prevue", type: "timestamptz" })
  @Index()
  finPrevue!: Date;

  @Column({ name: "fin_reelle", type: "timestamptz", nullable: true })
  finReelle?: Date;

  @Column({ type: 'text', name: "duree_jours" })
  dureeJours!: number;

  @Column({ type: 'int', name: "page_actuelle", default: 1 })
  pageActuelle!: number;

  @Column({ name: "pourcentage_lu", type: "decimal", precision: 5, scale: 2, default: 0 })
  pourcentageLu!: number;

  @Column({ type: 'int', name: "nb_renouvellements", default: 0 })
  nbRenouvellements!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
