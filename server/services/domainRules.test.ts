import { describe, expect, it } from "vitest";
import {
  calculateBorrowPrice,
  calculateMarketplaceSplit,
  calculateMarketplaceSplitFromSellerNet,
  calculatePenaltyAmount,
  calculateRenewalPrice,
  canBorrowForPlan,
  signedUrlExpiresAt,
} from "./domainRules.js";

describe("domainRules", () => {
  it("calcule les amendes 300/500/800 FCFA selon le retard", () => {
    expect(calculatePenaltyAmount(0)).toBe(0);
    expect(calculatePenaltyAmount(1)).toBe(300);
    expect(calculatePenaltyAmount(7)).toBe(300);
    expect(calculatePenaltyAmount(8)).toBe(500);
    expect(calculatePenaltyAmount(14)).toBe(500);
    expect(calculatePenaltyAmount(15)).toBe(800);
  });

  it("verifie les quotas d'emprunt selon le plan", () => {
    expect(canBorrowForPlan("free", 3)).toBe(true);
    expect(canBorrowForPlan("free", 0)).toBe(false);
    expect(canBorrowForPlan("student", 0)).toBe(true);
    expect(canBorrowForPlan("premium", 0)).toBe(true);
  });

  it("calcule les prix d'emprunt et renouvellement valides par l'enquete", () => {
    const book = { prix_location_7j: 500, prix_location_30j: 800 };
    expect(calculateBorrowPrice(book, 7)).toBe(500);
    expect(calculateBorrowPrice(book, 30)).toBe(800);
    expect(calculateRenewalPrice(7)).toBe(200);
    expect(calculateRenewalPrice(14)).toBe(350);
  });

  it("calcule la commission marketplace invisible", () => {
    expect(calculateMarketplaceSplit(10_000, "physique")).toEqual({
      commissionPct: 5,
      buyerPays: 10_000,
      platformReceives: 500,
      sellerReceives: 9_500,
    });
    expect(calculateMarketplaceSplit(10_000, "numerique")).toEqual({
      commissionPct: 8,
      buyerPays: 10_000,
      platformReceives: 800,
      sellerReceives: 9_200,
    });
  });

  it("ajoute les frais marketplace au prix net vendeur", () => {
    expect(calculateMarketplaceSplitFromSellerNet(4_000)).toEqual({
      commissionPct: 20,
      buyerPays: 4_800,
      platformReceives: 800,
      sellerReceives: 4_000,
    });
  });

  it("genere une expiration d'URL signee a 1 heure", () => {
    const now = new Date("2026-05-22T00:00:00.000Z");
    expect(signedUrlExpiresAt(now, 3600)).toBe("2026-05-22T01:00:00.000Z");
  });
});
