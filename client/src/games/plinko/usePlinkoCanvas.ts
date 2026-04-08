import { useCallback, useEffect, useRef } from "react";
import { type Difficulty, getBucketColor, getMultipliers } from "./multipliers";
import type { ActiveBall, PlinkoResult } from "./usePlinkoGame";

interface Waypoint {
	x: number;
	y: number;
}

interface CanvasGeometry {
	W: number;
	H: number;
	boardH: number;
	bucketBarH: number;
	pegSpacingX: number;
	pegSpacingY: number;
}

function getCanvasGeometry(
	canvas: HTMLCanvasElement,
	rows: number,
): CanvasGeometry {
	const W = canvas.width;
	const H = canvas.height;
	const bucketBarH = 36;
	const boardH = H - bucketBarH - 8;
	const pegSpacingY = boardH / (rows + 1);
	const pegSpacingX = W / (rows + 3);
	return { W, H, boardH, bucketBarH, pegSpacingX, pegSpacingY };
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
	ctx.lineTo(x + w, y + h - r);
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	ctx.lineTo(x + r, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
}

function formatMultiplierLabel(m: number): string {
	if (m >= 10000) return "10K";
	if (m >= 1000) return "1K";
	if (m >= 100) return `${Math.round(m)}`;
	return `${m}`;
}

function buildWaypoints(
	path: number[],
	rows: number,
	geo: CanvasGeometry,
): Waypoint[] {
	const { W, H, bucketBarH, pegSpacingX, pegSpacingY } = geo;
	const waypoints: Waypoint[] = [{ x: W / 2, y: pegSpacingY * 0.3 }];

	let rights = 0;
	for (let r = 0; r < path.length; r++) {
		if (path[r] === 1) rights++;
		const pegsInRow = r + 3;
		const rowWidth = (pegsInRow - 1) * pegSpacingX;
		const startX = (W - rowWidth) / 2;
		waypoints.push({
			x: startX + (rights + 0.5) * pegSpacingX,
			y: pegSpacingY * (r + 1.3),
		});
	}

	const lastRowStartX = (W - (rows + 1) * pegSpacingX) / 2;
	waypoints.push({
		x: lastRowStartX + (rights + 0.5) * pegSpacingX,
		y: H - bucketBarH - 6,
	});

	return waypoints;
}

interface BallAnimState {
	id: number;
	waypoints: Waypoint[];
	startTime: number;
	totalDuration: number;
	result: PlinkoResult;
	done: boolean;
}

interface UsePlinkoCanvasOptions {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	rows: number;
	difficulty: Difficulty;
	activeBalls: ActiveBall[];
	onBallComplete: (ballId: number, result: PlinkoResult) => void;
}

export function usePlinkoCanvas({
	canvasRef,
	rows,
	difficulty,
	activeBalls,
	onBallComplete,
}: UsePlinkoCanvasOptions) {
	const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const offscreenKeyRef = useRef<string>("");
	const ballAnimsRef = useRef<Map<number, BallAnimState>>(new Map());
	const rafIdRef = useRef<number | null>(null);
	const onBallCompleteRef = useRef(onBallComplete);
	onBallCompleteRef.current = onBallComplete;

	const drawBoard = useCallback(
		(
			ctx: CanvasRenderingContext2D,
			canvas: HTMLCanvasElement,
			highlightBuckets: number[],
			ballPositions: Waypoint[],
		) => {
			const multipliers = getMultipliers(rows, difficulty);
			const { W, H, bucketBarH, pegSpacingX, pegSpacingY } = getCanvasGeometry(
				canvas,
				rows,
			);
			const pegR = Math.max(3, Math.min(6, pegSpacingX * 0.12));

			// Rebuild offscreen cache when geometry or multipliers change
			const cacheKey = `${rows}|${difficulty}|${W}x${H}`;
			if (offscreenKeyRef.current !== cacheKey || !offscreenCanvasRef.current) {
				const oc = document.createElement("canvas");
				oc.width = W;
				oc.height = H;
				const octx = oc.getContext("2d")!;

				for (let row = 0; row < rows; row++) {
					const pegsInRow = row + 3;
					const rowWidth = (pegsInRow - 1) * pegSpacingX;
					const startX = (W - rowWidth) / 2;
					const y = pegSpacingY * (row + 1);
					for (let col = 0; col < pegsInRow; col++) {
						const x = startX + col * pegSpacingX;
						octx.beginPath();
						octx.arc(x, y, pegR, 0, Math.PI * 2);
						octx.fillStyle = "rgba(255,255,255,0.82)";
						octx.fill();
					}
				}

				const lastRowStartX = (W - (rows + 1) * pegSpacingX) / 2;
				const byPos = H - bucketBarH;
				for (let i = 0; i < rows + 1; i++) {
					const m = multipliers[i] ?? 0;
					const color = getBucketColor(m);
					const bucketCenterX = lastRowStartX + (i + 0.5) * pegSpacingX;
					const bx = bucketCenterX - pegSpacingX / 2;
					const pad = 2;
					octx.fillStyle = color;
					octx.strokeStyle = "rgba(0,0,0,0.35)";
					octx.lineWidth = 1;
					roundRect(
						octx,
						bx + pad,
						byPos + pad,
						pegSpacingX - pad * 2,
						bucketBarH - pad * 2,
						5,
					);
					octx.fill();
					octx.stroke();
					octx.fillStyle = "rgba(0,0,0,0.85)";
					octx.font = `bold ${Math.max(8, Math.min(11, pegSpacingX * 0.28))}px 'JetBrains Mono', monospace`;
					octx.textAlign = "center";
					octx.textBaseline = "middle";
					octx.fillText(
						formatMultiplierLabel(m),
						bucketCenterX,
						byPos + bucketBarH / 2,
					);
				}

				offscreenCanvasRef.current = oc;
				offscreenKeyRef.current = cacheKey;
			}

			ctx.clearRect(0, 0, W, H);
			ctx.drawImage(offscreenCanvasRef.current, 0, 0);

			// Highlight landed buckets
			for (const bucketIdx of highlightBuckets) {
				const lastRowStartX = (W - (rows + 1) * pegSpacingX) / 2;
				const byPos = H - bucketBarH;
				const m = multipliers[bucketIdx] ?? 0;
				const color = getBucketColor(m);
				const bucketCenterX = lastRowStartX + (bucketIdx + 0.5) * pegSpacingX;
				const bx = bucketCenterX - pegSpacingX / 2;
				const pad = 2;
				ctx.fillStyle = "#fff";
				ctx.strokeStyle = "rgba(0,0,0,0.35)";
				ctx.lineWidth = 1;
				roundRect(
					ctx,
					bx + pad,
					byPos + pad,
					pegSpacingX - pad * 2,
					bucketBarH - pad * 2,
					5,
				);
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = color;
				ctx.font = `bold ${Math.max(8, Math.min(11, pegSpacingX * 0.28))}px 'JetBrains Mono', monospace`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(
					formatMultiplierLabel(m),
					bucketCenterX,
					byPos + bucketBarH / 2,
				);
			}

			// Draw all balls
			for (const pos of ballPositions) {
				ctx.beginPath();
				ctx.arc(pos.x, pos.y, pegR * 1.3, 0, Math.PI * 2);
				ctx.fillStyle = "#10b981";
				ctx.shadowColor = "#10b981";
				ctx.shadowBlur = 12;
				ctx.fill();
				ctx.shadowBlur = 0;
			}
		},
		[rows, difficulty],
	);

	// Sync active balls into animation state
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const geo = getCanvasGeometry(canvas, rows);

		for (const ball of activeBalls) {
			if (!ballAnimsRef.current.has(ball.id)) {
				const waypoints = buildWaypoints(ball.path, rows, geo);
				ballAnimsRef.current.set(ball.id, {
					id: ball.id,
					waypoints,
					startTime: -1,
					totalDuration: waypoints.length * 90,
					result: ball.result,
					done: false,
				});
			}
		}
	}, [activeBalls, rows, canvasRef]);

	// Animation loop
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const geo = getCanvasGeometry(canvas, rows);
		const easeInOut = (t: number) =>
			t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

		const tick = (now: number) => {
			const ballPositions: Waypoint[] = [];
			const highlightBuckets: number[] = [];
			const completedIds: number[] = [];

			for (const anim of ballAnimsRef.current.values()) {
				if (anim.done) continue;
				if (anim.startTime < 0) anim.startTime = now;

				const globalT = Math.min(
					(now - anim.startTime) / anim.totalDuration,
					1,
				);
				const segCount = anim.waypoints.length - 1;
				const rawSeg = globalT * segCount;
				const segIdx = Math.min(Math.floor(rawSeg), segCount - 1);
				const easedT = easeInOut(rawSeg - segIdx);

				const p0 = anim.waypoints[segIdx];
				const p1 = anim.waypoints[segIdx + 1];
				const bx = p0.x + (p1.x - p0.x) * easedT;
				const by =
					p0.y +
					(p1.y - p0.y) * easedT -
					geo.pegSpacingY * 0.25 * Math.sin(Math.PI * easedT);

				if (globalT < 1) {
					ballPositions.push({ x: bx, y: by });
				} else {
					anim.done = true;
					highlightBuckets.push(anim.result.bucket);
					completedIds.push(anim.id);
				}
			}

			drawBoard(ctx, canvas, highlightBuckets, ballPositions);

			for (const id of completedIds) {
				const anim = ballAnimsRef.current.get(id);
				if (anim) {
					ballAnimsRef.current.delete(id);
					onBallCompleteRef.current(id, anim.result);
				}
			}

			rafIdRef.current = requestAnimationFrame(tick);
		};

		rafIdRef.current = requestAnimationFrame(tick);
		return () => {
			if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
		};
	}, [rows, canvasRef, drawBoard]);
}
