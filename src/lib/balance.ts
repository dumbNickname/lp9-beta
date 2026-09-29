// Spendable balance (DESIGN.md §13b): computed, never stored.
export interface ClaimLike {
  status: string;
  price_at_claim: number;
}

export function computeSpendable(
  receivedAmounts: readonly number[],
  myClaims: readonly ClaimLike[] = [],
): number {
  const received = receivedAmounts.reduce((sum, n) => sum + n, 0);
  const held = myClaims
    .filter((c) => c.status === "pending" || c.status === "accepted" || c.status === "delivered")
    .reduce((sum, c) => sum + c.price_at_claim, 0);
  return received - held;
}
