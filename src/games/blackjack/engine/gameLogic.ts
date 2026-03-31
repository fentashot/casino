/* ============================================================================
   Blackjack – Game Logic
   Pure state-transition functions. Each function takes the current game state
   and returns a new state — no side effects, no I/O, no mutation of inputs.
   ============================================================================ */

import * as crypto from "crypto";
import type { BlackjackGameState, Card, Hand, Suit, Rank } from "./types";
import { handTotal, isSoftHand, isBlackjack, canSplit } from "./cardEngine";
import { drawFromShoe, getOrBuildShoe } from "./shoeManager";

/* ============================================================================
   Deal — Start a new round
   ============================================================================ */

export async function dealGame(
  bet: number,
  balance: number,
  userId: string,
): Promise<BlackjackGameState> {
  // Ensure shoe is ready
  await getOrBuildShoe(userId);

  // Standard deal order: player, dealer(hidden), player, dealer(visible)
  const p1 = await drawFromShoe(userId);
  const d1: Card = { ...await drawFromShoe(userId), hidden: true };
  const p2 = await drawFromShoe(userId);
  const d2 = await drawFromShoe(userId);

  const gameId = crypto.randomBytes(16).toString("hex");
  const now = new Date().toISOString();

  const game: BlackjackGameState = {
    id: gameId,
    userId,
    dealerHand: { cards: [d1, d2], bet: 0 },
    playerHands: [{ cards: [p1, p2], bet }],
    activeHandIndex: 0,
    phase: "playing",
    balance: balance - bet,
    insuranceOffered: false,
    createdAt: now,
    updatedAt: now,
  };

  // Dealer's visible card is an Ace → offer insurance FIRST
  if (d2.rank === "A") {
    game.phase = "insurance";
    game.insuranceOffered = true;
    return game;
  }

  // Check immediate blackjack (no insurance scenario)
  const playerBJ = isBlackjack([p1, p2]);
  const dealerBJ = isBlackjack([{ ...d1, hidden: false }, d2]);

  if (playerBJ || dealerBJ) {
    return resolveImmediateBlackjack(game, playerBJ, dealerBJ);
  }

  return game;
}

/* ============================================================================
   Insurance — Accept or decline
   ============================================================================ */

/**
 * Resolve the insurance decision.
 * - "take": player pays half the original bet as insurance
 * - "skip": no insurance, proceed to normal play
 */
export function resolveInsurance(
  game: BlackjackGameState,
  action: "take" | "skip",
): BlackjackGameState {
  const updated = cloneGameState(game);
  const hand = updated.playerHands[0];
  const originalBet = hand.bet;

  // Peek at dealer's hidden card
  const dealerAllVisible = updated.dealerHand.cards.map((c) => ({
    ...c,
    hidden: false,
  }));
  const dealerBJ = isBlackjack(dealerAllVisible);

  if (action === "take") {
    const insuranceBet = Math.floor(originalBet / 2);

    if (updated.balance < insuranceBet) {
      throw new Error("insufficient_funds_insurance");
    }

    updated.balance -= insuranceBet;
    hand.insuranceBet = insuranceBet;

    if (dealerBJ) {
      // Insurance wins 2:1 — pay 2×insuranceBet + original stake back
      updated.balance += insuranceBet * 3;
      hand.insuranceResult = "win";

      revealDealerCards(updated);

      const playerBJ = isBlackjack(hand.cards);
      if (playerBJ) {
        hand.result = "push";
        updated.balance += originalBet; // main bet refunded
      } else {
        hand.result = "loss";
      }

      updated.phase = "finished";
    } else {
      // Insurance lost, play continues
      hand.insuranceResult = "loss";
      updated.phase = checkPlayerBlackjackAfterInsurance(updated);
    }
  } else {
    // Skip insurance
    hand.insuranceBet = 0;
    hand.insuranceResult = null;

    if (dealerBJ) {
      revealDealerCards(updated);

      const playerBJ = isBlackjack(hand.cards);
      if (playerBJ) {
        hand.result = "push";
        updated.balance += originalBet;
      } else {
        hand.result = "loss";
      }

      updated.phase = "finished";
    } else {
      updated.phase = checkPlayerBlackjackAfterInsurance(updated);
    }
  }

  updated.updatedAt = new Date().toISOString();
  return updated;
}

/* ============================================================================
   Player Actions — Hit, Stand, Double Down, Split
   ============================================================================ */

export async function hitHand(game: BlackjackGameState): Promise<BlackjackGameState> {
  const updated = cloneGameState(game);
  const hand = updated.playerHands[updated.activeHandIndex];

  const newCard = await drawFromShoe(updated.userId);
  hand.cards.push(newCard);

  const total = handTotal(hand.cards);

  if (total > 21) {
    hand.result = "bust";
    updated.activeHandIndex = advanceHand(updated);
  } else if (total === 21) {
    // Auto-stand on 21
    updated.activeHandIndex = advanceHand(updated);
  }

  updated.updatedAt = new Date().toISOString();
  return updated;
}

export function standHand(game: BlackjackGameState): BlackjackGameState {
  const updated = cloneGameState(game);
  updated.activeHandIndex = advanceHand(updated);
  updated.updatedAt = new Date().toISOString();
  return updated;
}

export async function doubleDown(game: BlackjackGameState): Promise<BlackjackGameState> {
  const updated = cloneGameState(game);
  const hand = updated.playerHands[updated.activeHandIndex];

  if (hand.cards.length !== 2) {
    throw new Error("can_only_double_on_two_cards");
  }
  if (updated.balance < hand.bet) {
    throw new Error("insufficient_funds");
  }

  updated.balance -= hand.bet;
  hand.bet *= 2;
  hand.doubled = true;

  const newCard = await drawFromShoe(updated.userId);
  hand.cards.push(newCard);

  const total = handTotal(hand.cards);
  if (total > 21) {
    hand.result = "bust";
  }

  // Double always stands after exactly one card
  updated.activeHandIndex = advanceHand(updated);
  updated.updatedAt = new Date().toISOString();
  return updated;
}

export async function splitHand(game: BlackjackGameState): Promise<BlackjackGameState> {
  const updated = cloneGameState(game);
  const hand = updated.playerHands[updated.activeHandIndex];

  if (!canSplit(hand.cards)) {
    throw new Error("cannot_split");
  }
  if (updated.balance < hand.bet) {
    throw new Error("insufficient_funds");
  }

  updated.balance -= hand.bet;

  const card1 = hand.cards[0];
  const card2 = hand.cards[1];
  const isAceSplit = card1.rank === "A";

  // Replace current hand: first card + a new card
  const firstNewCard = await drawFromShoe(updated.userId);
  hand.cards = [card1, firstNewCard];
  hand.result = undefined;
  hand.splitAces = isAceSplit;

  // Second split hand
  const secondNewCard = await drawFromShoe(updated.userId);
  const newHand: Hand = {
    cards: [card2, secondNewCard],
    bet: hand.bet,
    splitAces: isAceSplit,
  };

  updated.playerHands.splice(updated.activeHandIndex + 1, 0, newHand);

  // For split aces: skip both hands straight to dealer (only one card each)
  if (isAceSplit) {
    updated.activeHandIndex = updated.playerHands.length; // out-of-bounds → dealer
    updated.phase = "dealer";
  }

  updated.updatedAt = new Date().toISOString();
  return updated;
}

/* ============================================================================
   Dealer Resolution & Settlement
   ============================================================================ */

/**
 * Play dealer hand according to "stand on hard 17, hit on soft 17" rule,
 * then settle all player hands.
 */
export async function resolveDealerAndSettle(
  game: BlackjackGameState,
): Promise<BlackjackGameState> {
  const updated = cloneGameState(game);

  // Reveal dealer's hidden card
  revealDealerCards(updated);

  // Check if all player hands already busted — skip dealer draw
  const allBust = updated.playerHands.every(
    (h) => h.result === "bust" || h.result === "loss",
  );

  if (!allBust) {
    // Hit on hard <17 OR soft 17
    while (true) {
      const total = handTotal(updated.dealerHand.cards);
      const soft = isSoftHand(updated.dealerHand.cards);

      if (total < 17 || (total === 17 && soft)) {
        updated.dealerHand.cards.push(await drawFromShoe(updated.userId));
      } else {
        break;
      }
    }
  }

  // Settle each hand
  settleHands(updated);

  updated.phase = "finished";
  updated.updatedAt = new Date().toISOString();
  return updated;
}

/**
 * Advance the active hand index. When all hands are done,
 * sets phase to "dealer" and returns an out-of-bounds index.
 */
export function advanceHand(game: BlackjackGameState): number {
  const nextIndex = game.activeHandIndex + 1;

  if (nextIndex >= game.playerHands.length) {
    game.phase = "dealer";
    return game.playerHands.length; // signals "all done"
  }

  return nextIndex;
}

/**
 * Check whether we should trigger dealer play after an action.
 */
export function shouldTriggerDealer(game: BlackjackGameState): boolean {
  return (
    game.phase === "dealer" || game.activeHandIndex >= game.playerHands.length
  );
}

/* ============================================================================
   Sanitization — Strip hidden card info before sending to client
   ============================================================================ */

export function sanitizeGame(game: BlackjackGameState): BlackjackGameState {
  return {
    ...game,
    dealerHand: {
      ...game.dealerHand,
      cards: game.dealerHand.cards.map((c) =>
        c.hidden
          ? { suit: "♠" as Suit, rank: "?" as unknown as Rank, hidden: true }
          : c,
      ),
    },
  };
}

/* ============================================================================
   Internal Helpers
   ============================================================================ */

/**
 * Shallow-clone the game state. Uses structuredClone for nested arrays/objects.
 * This is the single place we pay the clone cost — all public functions call it
 * exactly once, then mutate the clone.
 */
function cloneGameState(game: BlackjackGameState): BlackjackGameState {
  return {
    ...game,
    dealerHand: {
      ...game.dealerHand,
      cards: game.dealerHand.cards.map((c) => ({ ...c })),
    },
    playerHands: game.playerHands.map((h) => ({
      ...h,
      cards: h.cards.map((c) => ({ ...c })),
    })),
  };
}

/** Reveal all dealer cards in-place on a (cloned) game state */
function revealDealerCards(game: BlackjackGameState): void {
  for (let i = 0; i < game.dealerHand.cards.length; i++) {
    if (game.dealerHand.cards[i].hidden) {
      game.dealerHand.cards[i] = {
        ...game.dealerHand.cards[i],
        hidden: false,
      };
    }
  }
}

/** Handle immediate blackjack when no insurance is in play */
function resolveImmediateBlackjack(
  game: BlackjackGameState,
  playerBJ: boolean,
  dealerBJ: boolean,
): BlackjackGameState {
  revealDealerCards(game);
  game.phase = "finished";
  const hand = game.playerHands[0];
  const bet = hand.bet;

  if (playerBJ && dealerBJ) {
    hand.result = "push";
    game.balance += bet; // refund
  } else if (playerBJ) {
    hand.result = "blackjack";
    game.balance += Math.floor(bet * 2.5); // 3:2 payout
  } else {
    // dealer blackjack only
    hand.result = "loss";
  }

  return game;
}

/** After insurance is resolved without dealer BJ, check if player has BJ */
function checkPlayerBlackjackAfterInsurance(
  game: BlackjackGameState,
): BlackjackGameState["phase"] {
  const hand = game.playerHands[0];
  const playerBJ = isBlackjack(hand.cards);

  if (playerBJ) {
    revealDealerCards(game);
    hand.result = "blackjack";
    game.balance += Math.floor(hand.bet * 2.5); // 3:2
    return "finished";
  }

  return "playing";
}

/** Settle all player hands against the dealer total */
function settleHands(game: BlackjackGameState): void {
  const dealerTotal = handTotal(game.dealerHand.cards);
  const dealerBust = dealerTotal > 21;

  for (const hand of game.playerHands) {
    // Already settled (bust / loss from insurance)
    if (hand.result === "bust" || hand.result === "loss") {
      continue;
    }

    const playerTotal = handTotal(hand.cards);
    const playerBJ = isBlackjack(hand.cards) && !hand.splitAces; // split-ace 21 ≠ BJ

    if (playerBJ) {
      hand.result = "blackjack";
      game.balance += Math.floor(hand.bet * 2.5);
    } else if (dealerBust) {
      hand.result = "win";
      game.balance += hand.bet * 2;
    } else if (playerTotal > dealerTotal) {
      hand.result = "win";
      game.balance += hand.bet * 2;
    } else if (playerTotal === dealerTotal) {
      hand.result = "push";
      game.balance += hand.bet; // refund
    } else {
      hand.result = "loss";
    }
  }
}
