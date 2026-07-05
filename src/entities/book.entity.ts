import {
  Column, CreateDateColumn, Entity, Index,
  ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";
import { BorrowEntity } from "./borrow.entity";
import { BookNoteEntity } from "./book-note.entity";
import { ChapterEntity } from "./chapter.entity";

export enum BookStatus {
  DRAFT     = "brouillon",
  PENDING   = "pending",
  PUBLISHED = "publie",
  SUSPENDED = "suspendu",
  ARCHIVED  = "archive",
}

@Entity("books")
export class BookEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: 'text' })
  titre!: string;

  @Column({ type: 'text' })
  auteur!: string;

  @Column({ name: "author_profile_id", type: "uuid", nullable: true })
  authorProfileId?: string;

  @Column({ nullable: true, type: "text" })
  description?: string;

  @Column({ type: 'text' })
  @Index()
  categorie!: string;

  @Column({ type: 'text', nullable: true })
  filiere?: string;

  @Column({ type: 'text', name: "type_acces", nullable: true, default: "gratuit" })
  typeAcces?: string;

  @Column({ type: "enum", enum: BookStatus, default: BookStatus.DRAFT })
  @Index()
  status!: BookStatus;

  @Column({ type: 'text', nullable: true })
  isbn?: string;

  @Column({ type: 'text', default: "fr" })
  langue!: string;

  @Column({ name: "nombre_pages", nullable: true, type: "int" })
  nombrePages?: number;

  @Column({ type: 'text', name: "cover_url", nullable: true })
  coverUrl?: string;

  @Column({ type: 'text', name: "file_url", nullable: true })
  fileUrl?: string;

  @Column({ type: 'int', name: "prix_achat", default: 2000 })
  prixAchat!: number;

  @Column({ type: 'int', name: "prix_location_7j", default: 500 })
  prixLocation7j!: number;

  @Column({ type: 'int', name: "prix_location_30j", default: 800 })
  prixLocation30j!: number;

  @Column({ name: "note_moyenne", type: "decimal", precision: 3, scale: 2, default: 0 })
  noteMoyenne!: number;

  @Column({ type: 'int', name: "reviews_count", default: 0 })
  reviewsCount!: number;

  @Column({ type: 'int', name: "nb_vues", default: 0 })
  nbVues!: number;

  @Column({ type: 'int', name: "nb_emprunts", default: 0 })
  nbEmprunts!: number;

  @Column({ type: 'boolean', default: false })
  @Index()
  featured!: boolean;

  @Column({ type: 'int', name: "free_chapters_count", default: 3 })
  freeChaptersCount!: number;

  @Column({ name: "published_at", type: "timestamptz", nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => BorrowEntity, (b) => b.book)
  borrows!: BorrowEntity[];

  @OneToMany(() => BookNoteEntity, (n) => n.book)
  notes!: BookNoteEntity[];

  @OneToMany(() => ChapterEntity, (c) => c.book)
  chapters!: ChapterEntity[];
}
