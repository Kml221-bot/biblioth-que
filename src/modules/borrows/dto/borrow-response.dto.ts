import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BorrowStatus, PenaltyStatus, TypeAcces } from "@prisma/client";

export class BorrowBookResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  titre!: string;

  @ApiProperty({ type: String })
  auteur!: string;

  @ApiProperty({ type: String })
  categorie!: string;

  @ApiProperty({ enum: TypeAcces })
  typeAcces!: TypeAcces;

  @ApiPropertyOptional({ type: String, nullable: true })
  coverUrl?: string | null;
}

export class PenaltyResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: Number })
  montantFcfa!: number;

  @ApiProperty({ type: Number })
  joursRetard!: number;

  @ApiProperty({ enum: PenaltyStatus })
  status!: PenaltyStatus;
}

export class BorrowResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ enum: BorrowStatus })
  statut!: BorrowStatus;

  @ApiProperty({ type: Date })
  debut!: Date;

  @ApiProperty({ type: Date })
  finPrevue!: Date;

  @ApiPropertyOptional({ type: Date, nullable: true })
  finReelle?: Date | null;

  @ApiProperty({ type: Number })
  dureeJours!: number;

  @ApiProperty({ type: Number })
  joursRestants!: number;

  @ApiProperty({ type: Number })
  pageActuelle!: number;

  @ApiProperty({ type: Number })
  pourcentageLu!: number;

  @ApiProperty({ type: Number })
  nbRenouvellements!: number;

  @ApiProperty({ type: BorrowBookResponseDto })
  book!: BorrowBookResponseDto;

  @ApiPropertyOptional({ type: [PenaltyResponseDto] })
  penalties?: PenaltyResponseDto[];
}

export class RenewalPaymentResponseDto {
  @ApiProperty({ type: String })
  borrowId!: string;

  @ApiProperty({ type: String })
  transactionId!: string;

  @ApiProperty({ type: Number })
  montantFcfa!: number;

  @ApiProperty({ type: String })
  status!: string;
}
