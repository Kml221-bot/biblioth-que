import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AiChatResponseDto {
  @ApiProperty({ type: String })
  message!: string;

  @ApiProperty({ enum: ["fr", "wo", "pu"] })
  language!: "fr" | "wo" | "pu";

  @ApiPropertyOptional({ type: String })
  bookContextId?: string;
}

export class AiSummaryResponseDto {
  @ApiProperty({ type: [String] })
  points!: string[];

  @ApiProperty({ type: String })
  citation!: string;
}

export class QuizQuestionDto {
  @ApiProperty({ type: String })
  question!: string;

  @ApiProperty({ type: [String] })
  options!: string[];

  @ApiProperty({ enum: ["facile", "moyenne", "difficile"] })
  difficulty!: "facile" | "moyenne" | "difficile";
}

export class AiQuizResponseDto {
  @ApiProperty({ type: [QuizQuestionDto] })
  questions!: QuizQuestionDto[];

  @ApiProperty({ type: [Number] })
  correctAnswers!: number[];
}

export class AiRecommendationDto {
  @ApiProperty({ type: String })
  bookId!: string;

  @ApiProperty({ type: String })
  titre!: string;

  @ApiProperty({ type: String })
  reason!: string;
}
