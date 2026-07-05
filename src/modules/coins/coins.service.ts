import { Inject, Injectable } from "@nestjs/common";
import { CoinTransactionType } from "@prisma/client";
import {
  CoinBalanceResponseDto,
  CoinPackDto,
  CoinTransactionResponseDto,
  CreditCoinsDto,
} from "./dto";
import { CoinsRepository } from "./coins.repository";

// Catalogue des packs de pièces disponibles à l'achat
const COIN_PACKS: CoinPackDto[] = [
  { id: "pack_30",  label: "Pack Découverte", coins: 30,  prixFcfa: 300,  isPopular: false },
  { id: "pack_100", label: "Pack Étudiant",   coins: 100, prixFcfa: 900,  isPopular: true  },
  { id: "pack_250", label: "Pack Pro",        coins: 250, prixFcfa: 2000, isPopular: false },
  { id: "pack_500", label: "Pack Premium",    coins: 500, prixFcfa: 3500, isPopular: false },
];

@Injectable()
export class CoinsService {
  constructor(@Inject(CoinsRepository) private readonly repo: CoinsRepository) {}

  async getBalance(userId: string): Promise<CoinBalanceResponseDto> {
    const result = await this.repo.getBalance(userId);
    return { balance: result?.coinBalance ?? 0 };
  }

  async getTransactions(userId: string): Promise<CoinTransactionResponseDto[]> {
    const txs = await this.repo.getTransactions(userId);
    return txs.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      description: tx.description,
      chapterId: tx.chapterId,
      createdAt: tx.createdAt,
    }));
  }

  getPacks(): CoinPackDto[] {
    return COIN_PACKS;
  }

  // Achat simulé — en production, intégrer Naboopay ici
  async purchase(userId: string, packId: string): Promise<CoinBalanceResponseDto> {
    const pack = COIN_PACKS.find(p => p.id === packId);
    if (!pack) throw new Error("Pack introuvable");

    const newBalance = await this.repo.credit(
      userId,
      pack.coins,
      CoinTransactionType.PURCHASE,
      `Achat ${pack.label} — ${pack.prixFcfa} FCFA`
    );

    return { balance: newBalance };
  }

  // Admin uniquement — créditer manuellement un utilisateur
  async creditUser(dto: CreditCoinsDto): Promise<CoinBalanceResponseDto> {
    const newBalance = await this.repo.credit(
      dto.userId,
      dto.amount,
      CoinTransactionType.BONUS,
      dto.description ?? "Bonus admin"
    );
    return { balance: newBalance };
  }
}
