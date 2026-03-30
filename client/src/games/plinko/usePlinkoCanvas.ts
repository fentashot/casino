import { type RefObject, useCallback, useEffect, useRef } from "react";
import { type Difficulty, getBucketColor, getMultipliers } from "./multipliers";

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

interface UsePlinkoCanvasOptions {
	canvasRef: RefObject<HTMLCanvasElement | null>;
	rows: number;
	difficulty: Difficulty;
	activeBucketIdx: number | null;
	ballPath: number[] | null;
	onAnimationComplete: () => void;
}

export function usePlinkoCanvas({
	canvasRef,
	rows,
	difficulty,
	activeBucketIdx,
	ballPath,
	onAnimationComplete,
}: UsePlinkoCanvasOptions) {
	const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const offscreenKeyRef = useRef<string>("");
	const drawBoardRef = useRef<
		((highlightBucket: number | null, ballPos?: Waypoint | null) => void) | null
	>(null);

	const drawBoard = useCallback(
		(highlightBucket: number | null = null, ballPos?: Waypoint | null) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

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

			if (highlightBucket !== null) {
				const lastRowStartX = (W - (rows + 1) * pegSpacingX) / 2;
				const byPos = H - bucketBarH;
				const m = multipliers[highlightBucket] ?? 0;
				const color = getBucketColor(m);
				const bucketCenterX =
					lastRowStartX + (highlightBucket + 0.5) * pegSpacingX;
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

			if (ballPos) {
				ctx.beginPath();
				ctx.arc(ballPos.x, ballPos.y, pegR * 1.3, 0, Math.PI * 2);
				ctx.fillStyle = "#10b981";
				ctx.shadowColor = "#10b981";
				ctx.shadowBlur = 12;
				ctx.fill();
				ctx.shadowBlur = 0;
			}
		},
		[rows, difficulty, canvasRef],
	);

	// Keep ref current for animation loop
	useEffect(() => {
		drawBoardRef.current = drawBoard;
	}, [drawBoard]);

	// Static board draw
	useEffect(() => {
		drawBoard(activeBucketIdx, null);
	}, [drawBoard, activeBucketIdx]);

	// Ball animation
	useEffect(() => {
		if (!ballPath) return;
		const canvas = canvasRef.current;
		if (!canvas) return;

		const { W, H, bucketBarH, pegSpacingX, pegSpacingY } = getCanvasGeometry(
			canvas,
			rows,
		);
		const waypoints: Waypoint[] = [{ x: W / 2, y: pegSpacingY * 0.3 }];

		let rights = 0;
		for (let r = 0; r < ballPath.length; r++) {
			if (ballPath[r] === 1) rights++;
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

		const totalDuration = waypoints.length * 90;
		let startTime: number | null = null;
		let rafId: number;

		const easeInOut = (t: number) =>
			t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

		const animate = (now: number) => {
			if (startTime === null) startTime = now;
			const globalT = Math.min((now - startTime) / totalDuration, 1);

			const segCount = waypoints.length - 1;
			const rawSeg = globalT * segCount;
			const segIdx = Math.min(Math.floor(rawSeg), segCount - 1);
			const easedT = easeInOut(rawSeg - segIdx);

			const p0 = waypoints[segIdx];
			const p1 = waypoints[segIdx + 1];
			const bx = p0.x + (p1.x - p0.x) * easedT;
			const by =
				p0.y +
				(p1.y - p0.y) * easedT -
				pegSpacingY * 0.25 * Math.sin(Math.PI * easedT);

			drawBoardRef.current?.(null, { x: bx, y: by });

			if (globalT < 1) {
				rafId = requestAnimationFrame(animate);
			} else {
				drawBoardRef.current?.(null, null);
				onAnimationComplete();
			}
		};

		rafId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(rafId);
	}, [ballPath, rows, canvasRef, onAnimationComplete]);
}
