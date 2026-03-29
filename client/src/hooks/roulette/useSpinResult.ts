/* ============================================================================
   useSpinResult — Deferred spin result & wheel-animation synchronisation
   Manages the "pending spin" pattern: the server response arrives before the
   wheel stops, so we buffer it and apply balance/nonce updates only after
   the wheel animation calls `onSpinEnd`. A safety timeout auto-unlocks after
   10 s in case the wheel component never fires the callback.
   ============================================================================ */

import type { SpinResponse } from "@server/types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

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
	const spinTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const pendingSpinRef = useRef<SpinResponse | null>(null);

	/** Buffer a successful spin response — UI will be unlocked by onSpinEnd */
	const bufferResult = useCallback(
		(spin: SpinResponse) => {
			setResult(spin.result);
			setSpinData(spin);
			pendingSpinRef.current = spin;

			// Safety timeout — force unlock after 10 s
			if (spinTimeoutIdRef.current) clearTimeout(spinTimeoutIdRef.current);
			spinTimeoutIdRef.current = setTimeout(() => {
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
				spinTimeoutIdRef.current = null;
				setIsSpinning(false);
				setShowResult(true);
				queryClient.invalidateQueries({ queryKey: ["casino-history"] });
			}, 10_000);
		},
		[queryClient],
	);

	/** Called by the wheel component when the animation finishes */
	const onSpinEnd = useCallback(() => {
		if (spinTimeoutIdRef.current) {
			clearTimeout(spinTimeoutIdRef.current);
			spinTimeoutIdRef.current = null;
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
	}, [queryClient, onResultApplied]);

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
