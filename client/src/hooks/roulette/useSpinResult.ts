/* ============================================================================
   useSpinResult — Deferred spin result & wheel-animation synchronisation
   Manages the "pending spin" pattern: the server response arrives before the
   wheel stops, so we buffer it and apply balance/nonce updates only after
   the wheel animation calls `onSpinEnd`. A safety timeout auto-unlocks after
   10 s in case the wheel component never fires the callback.
   ============================================================================ */

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SpinResponse } from "@server/types";

type Result = {
  number: number;
  color: "red" | "black" | "green";
};

interface UseSpinResultOptions {
  onResultApplied: (spin: SpinResponse) => void;
}

export function useSpinResult({ onResultApplied }: UseSpinResultOptions) {
  const queryClient = useQueryClient();

  const [result, setResult] = useState<Result | null>(null);
  const [spinData, setSpinData] = useState<SpinResponse | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTimeoutId, setSpinTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const pendingSpinRef = useRef<SpinResponse | null>(null);

  /** Buffer a successful spin response — UI will be unlocked by onSpinEnd */
  const bufferResult = useCallback(
    (spin: SpinResponse) => {
      setResult(spin.result);
      setSpinData(spin);
      pendingSpinRef.current = spin;

      // Safety timeout — force unlock after 10 s
      const timeoutId = setTimeout(() => {
        const pending = pendingSpinRef.current;
        if (pending) {
          queryClient.setQueryData(["casino-balance"], {
            balance: pending.newBalance,
          });
          queryClient.setQueryData(["casino-nonce"], {
            nextNonce: pending.provablyFair.nonce + 1,
          });
          pendingSpinRef.current = null;
        }
        setIsSpinning(false);
        setShowResult(true);
        queryClient.invalidateQueries({ queryKey: ["casino-history"] });
      }, 10_000);

      setSpinTimeoutId(timeoutId);
    },
    [queryClient],
  );

  /** Called by the wheel component when the animation finishes */
  const onSpinEnd = useCallback(() => {
    if (spinTimeoutId) {
      clearTimeout(spinTimeoutId);
      setSpinTimeoutId(null);
    }

    const pending = pendingSpinRef.current;
    if (pending) {
      queryClient.setQueryData(["casino-balance"], {
        balance: pending.newBalance,
      });
      queryClient.setQueryData(["casino-nonce"], {
        nextNonce: pending.provablyFair.nonce + 1,
      });
      pendingSpinRef.current = null;
      onResultApplied(pending);
    }

    setIsSpinning(false);
    setShowResult(true);
    queryClient.invalidateQueries({ queryKey: ["casino-history"] });
  }, [queryClient, spinTimeoutId, onResultApplied]);

  /** Reset visual state before a new spin */
  const prepareForSpin = useCallback(() => {
    setShowResult(false);
    setIsSpinning(true);
  }, []);

  /** Abort the spinning state (on error) */
  const abortSpin = useCallback(() => {
    setIsSpinning(false);
  }, []);

  return {
    result,
    spinData,
    showResult,
    isSpinning,
    bufferResult,
    onSpinEnd,
    prepareForSpin,
    abortSpin,
  };
}
