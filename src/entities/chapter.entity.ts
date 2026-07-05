import {
  Column, CreateDateColumn, Entity, Index,
  ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
  JoinColumn, Unique,
} from "typeorm";
import { BookEntity } from "./book.entity";
import { UserChapterAccessEntity } from "./user-chapter-access.entity";

@Entity("chapters")
@Unique(["book", "ordre"])
export class ChapterEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "book_id", type: "uuid" })
  bookId!: string;

  @ManyToOne(() => BookEntity, (b) => b.chapters, { onDelete: "CASCADE" })
  @JoinColumn({ name: "book_id" })
  @Index()
  book!: BookEntity;

  @Column({ type: 'text' })
  titre!: string;

  @Column({ type: "int" })
  ordre!: number;

  @Column({ type: 'boolean', name: "is_free", default: false })
  isFree!: boolean;

  @Column({ type: 'int', name: "prix_pieces", default: 0 })
  prixPieces!: number;

  @Column({ type: 'text', name: "content_url", nullable: true })
  contentUrl?: string;

  @Column({ nullable: true, type: "text" })
  description?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => UserChapterAccessEntity, (a) => a.chapter)
  accesses!: UserChapterAccessEntity[];
}
