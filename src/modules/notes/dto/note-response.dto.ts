import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NoteColor, NoteType } from "@prisma/client";

export class NoteUserResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  nom!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  prenom?: string | null;
}

export class NoteResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  bookId!: string;

  @ApiProperty({ type: Number })
  page!: number;

  @ApiProperty({ enum: NoteType })
  type!: NoteType;

  @ApiPropertyOptional({ type: String, nullable: true })
  contenu?: string | null;

  @ApiProperty({ enum: NoteColor })
  couleur!: NoteColor;

  @ApiProperty({ type: Number })
  likesCount!: number;

  @ApiProperty({ type: Boolean })
  isPublic!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  sharedWithCommunityId?: string | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;

  @ApiProperty({ type: NoteUserResponseDto })
  user!: NoteUserResponseDto;
}

export class NoteLikeResponseDto {
  @ApiProperty({ type: Boolean })
  liked!: boolean;

  @ApiProperty({ type: Number })
  likesCount!: number;
}
