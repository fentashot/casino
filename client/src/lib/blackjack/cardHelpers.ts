/* ============================================================================
   Blackjack – Client-Side Card Helpers
   Pure functions for hand evaluation, display state building, and card
   counting. These mirror the server-side logic but operate on the client
   DisplayCard/CardData types (which include the "?" rank for hidden cards).

   No side effects, no I/O, no React dependencies — safe to use anywhere.
   ============================================================================ */

import type { CardData, BlackjackGameState, Rank } from "./types";

/* ============================================================================
   Card Value & Hand Evaluation
   ============================================================================ */

const FACE_CARDS: ReadonlySet<string> = new Set(["J", "Q", "K"]);

/** Numeric value of a single card rank (Ace = 11 initially, "?" = 0) */
export function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (FACE_CARDS.has(rank)) return 10;
  const n = parseInt(rank, 10);
  return isNaN(n) ? 0 : n;
}

/** Best hand total, counting aces as 1 when needed to stay ≤ 21 */
export function handTotal(cards: readonly CardData[]): number {
  let total = 0;
  let aces = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (card.hidden) continue;
    total += cardValue(card.rank);
    if (card.rank === "A") aces++;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

/** Whether the hand is "soft" (contains an Ace counted as 11) */
export function isSoftHand(cards: readonly CardData[]): boolean {
  let total = 0;
  let aces = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (card.hidden) continue;
    total += cardValue(card.rank);
    if (card.rank === "A") aces++;
  }

  return aces > 0 && total <= 21 && total - 10 >= 1;
}

/** Whether the hand can be split (exactly 2 cards of equal value) */
export function canSplitHand(cards: readonly CardData[]): boolean {
  return (
    cards.length === 2 && cardValue(cards[0].rank) === cardValue(cards[1].rank)
  );
}

/* ============================================================================
   Card Counting — used by the reveal queue
   ============================================================================ */

/** Count all cards across dealer + all player hands */
export function countAllCards(state: BlackjackGameState | null): number {
  if (!state) return 0;
  let n = state.dealerHand.cards.length;
  for (let i = 0; i < state.playerHands.length; i++) {
    n += state.playerHands[i].cards.length;
  }
  return n;
}

/* ============================================================================
   Display State Building — for the sequential card reveal animation
   ============================================================================ */

/**
 * Build an "empty" display state from a server state — all hands have 0 cards.
 * Used as the initial frame before the reveal queue starts animating cards in.
 */
export function buildEmptyDisplayState(
  server: BlackjackGameState,
): BlackjackGameState {
  return {
    ...server,
    dealerHand: { ...server.dealerHand, cards: [] },
    playerHands: server.playerHands.map((h) => ({ ...h, cards: [] })),
  };
}

/**
 * Build a display version of the game state where only the first
 * `revealedCount` cards are shown, in canonical deal order:
 *
 *   player[0][0] → dealer[0] → player[0][1] → dealer[1] → extra hits…
 *
 * This drives the sequential card-deal animation without remounting
 * already-visible cards (stable key generation is handled in the component).
 */
export function buildDisplayState(
  server: BlackjackGameState,
  revealedCount: number,
): BlackjackGameState {
  // Build the deal order — determines which card appears at which step
  const dealOrder: Array<{ target: "dealer" | number; cardIndex: number }> = [];

  // Initial 4-card deal: p0, d0, p1, d1
  for (let i = 0; i < 2; i++) {
    if (i < (server.playerHands[0]?.cards.length ?? 0)) {
      dealOrder.push({ target: 0, cardIndex: i });
    }
    if (i < server.dealerHand.cards.length) {
      dealOrder.push({ target: "dealer", cardIndex: i });
    }
  }

  // Extra player cards (hits, doubles, split hands)
  for (let hi = 0; hi < server.playerHands.length; hi++) {
    const startIdx = hi === 0 ? 2 : 0;
    for (let ci = startIdx; ci < server.playerHands[hi].cards.length; ci++) {
      dealOrder.push({ target: hi, cardIndex: ci });
    }
  }

  // Extra dealer cards (dealer hits)
  for (let ci = 2; ci < server.dealerHand.cards.length; ci++) {
    dealOrder.push({ target: "dealer", cardIndex: ci });
  }

  // Build the display state by filling cards up to revealedCount
  const dealerCards: CardData[] = [];
  const playerHands: CardData[][] = server.playerHands.map(() => []);

  let filled = 0;
  for (let i = 0; i < dealOrder.length && filled < revealedCount; i++) {
    const slot = dealOrder[i];
    if (slot.target === "dealer") {
      const src = server.dealerHand.cards[slot.cardIndex];
      if (src) {
        dealerCards.push(src);
        filled++;
      }
    } else {
      const src = server.playerHands[slot.target]?.cards[slot.cardIndex];
      if (src && playerHands[slot.target]) {
        playerHands[slot.target].push(src);
        filled++;
      }
    }
  }

  return {
    ...server,
    dealerHand: { ...server.dealerHand, cards: dealerCards },
    playerHands: server.playerHands.map((h, i) => ({
      ...h,
      cards: playerHands[i],
    })),
  };
}
