import {
  Column, CreateDateColumn, Entity,
  ManyToOne, PrimaryGeneratedColumn, JoinColumn, Unique, Index,
} from "typeorm";
import { UserEntity } from "./user.entity";
import { ChapterEntity } from "./chapter.entity";

@Entity("user_chapter_accesses")
@Unique(["user", "chapter"])
export class UserChapterAccessEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => UserEntity, (u) => u.chapterAccesses, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  @Index()
  user!: UserEntity;

  @Column({ name: "chapter_id", type: "uuid" })
  chapterId!: string;

  @ManyToOne(() => ChapterEntity, (c) => c.accesses, { onDelete: "CASCADE" })
  @JoinColumn({ name: "chapter_id" })
  chapter!: ChapterEntity;

  @Column({ type: 'int', name: "paid_pieces", default: 0 })
  paidPieces!: number;

  @CreateDateColumn({ name: "unlocked_at", type: "timestamptz" })
  unlockedAt!: Date;
}
