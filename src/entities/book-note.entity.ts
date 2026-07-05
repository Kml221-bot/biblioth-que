import {
  Column, CreateDateColumn, Entity, Index,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";
import { BookEntity } from "./book.entity";

export enum NoteType {
  NOTE      = "note",
  HIGHLIGHT = "surlignage",
  BOOKMARK  = "signet",
  QUESTION  = "question",
}

export enum NoteColor {
  YELLOW = "yellow",
  GREEN  = "green",
  BLUE   = "blue",
  PINK   = "pink",
  ORANGE = "orange",
}

@Entity("book_notes")
export class BookNoteEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => UserEntity, (u) => u.notes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  @Column({ name: "book_id", type: "uuid" })
  bookId!: string;

  @ManyToOne(() => BookEntity, (b) => b.notes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "book_id" })
  @Index()
  book!: BookEntity;

  @Column({ type: "int" })
  page!: number;

  @Column({ type: "enum", enum: NoteType })
  type!: NoteType;

  @Column({ nullable: true, type: "text" })
  contenu?: string;

  @Column({ type: "enum", enum: NoteColor, default: NoteColor.YELLOW })
  couleur!: NoteColor;

  @Column({ type: 'text', nullable: true })
  epubcfi?: string;

  @Column({ name: "selected_text", nullable: true, type: "text" })
  selectedText?: string;

  @Column({ type: 'boolean', name: "is_public", default: false })
  isPublic!: boolean;

  @Column({ type: 'int', name: "likes_count", default: 0 })
  likesCount!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
