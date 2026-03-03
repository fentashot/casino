import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { rBlack, rGreen, rRed } from "@/lib/utils";

// Cubic bezier easing used for the wheel spin: [0.22, 0.61, 0.36, 1]
// We approximate its inverse to derive real-time angular velocity so ticks
// slow down in sync with the physical deceleration of the wheel.
function cubicBezierProgress(t: number): number {
  // Control points: P1=(0.22,0.61), P2=(0.36,1)  (CSS cubic-bezier)
  // Iterative solve for y(t) given normalized time t in [0,1]
  const p1x = 0.22,
    p1y = 0.61,
    p2x = 0.36,
    p2y = 1.0;
  // Find parametric u such that bezierX(u) == t
  let u = t;
  for (let i = 0; i < 8; i++) {
    const bx =
      3 * u * (1 - u) * (1 - u) * p1x + 3 * u * u * (1 - u) * p2x + u * u * u;
    const dbx =
      3 * (1 - u) * (1 - u) * p1x +
      6 * u * (1 - u) * (p2x - p1x) +
      3 * u * u * (1 - p2x);
    if (Math.abs(dbx) < 1e-6) break;
    u -= (bx - t) / dbx;
    u = Math.max(0, Math.min(1, u));
  }
  // Now compute y at parameter u
  return (
    3 * u * (1 - u) * (1 - u) * p1y + 3 * u * u * (1 - u) * p2y + u * u * u
  );
}

type Props = {
  pockets?: number; // default: 37
  size?: number; // px
  targetNumber?: number | null;
  onSpinEnd?: (n: number) => void;
  spinning?: boolean;
  fontSizeProp?: number;
};

const defaultColors = (i: number) => {
  if (i === 0) return rGreen;
  const redSet = new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ]);
  return redSet.has(i) ? rRed : rBlack;
};

export const AnimatedWheel: React.FC<Props> = ({
  pockets = 37,
  size = 300,
  targetNumber = null,
  onSpinEnd,
  fontSizeProp = 12,
}) => {
  const anglePerPocket = 360 / pockets;
  const controls = useAnimation();
  const [isSpinning, setIsSpinning] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Tracks all scheduled AudioContext nodes so we can cancel them on cleanup
  const scheduledNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode }[]>(
    [],
  );

  const totalRotationRef = useRef(0);

  const rouletteSequence = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
  ];

  useEffect(() => {
    audioCtxRef.current = null; // lazy init
    return () => {
      cancelScheduledTicks();
    };
  }, []);

  const getAudioCtx = (): AudioContext | null => {
    try {
      if (!audioCtxRef.current) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioCtxRef.current = new AC();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  // Cancel all tick nodes that haven't played yet
  const cancelScheduledTicks = () => {
    for (const { osc, gain } of scheduledNodesRef.current) {
      try {
        gain.gain.cancelScheduledValues(0);
        osc.stop(0);
      } catch {
        /* already stopped */
      }
    }
    scheduledNodesRef.current = [];
  };

  // Schedule a single tick at a precise AudioContext time
  const scheduleTick = (ctx: AudioContext, atTime: number, freq: number) => {
    try {
      const duration = 0.018;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, atTime);
      gain.gain.linearRampToValueAtTime(0.0012, atTime + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.00001, atTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(atTime);
      osc.stop(atTime + duration + 0.005);
      scheduledNodesRef.current.push({ osc, gain });
    } catch {
      /* ignore */
    }
  };

  // Pre-schedule all ticks for the entire spin upfront using AudioContext clock.
  // We derive the angular position at each moment using the same bezier easing
  // as framer-motion, then emit a tick whenever a new pocket boundary is crossed.
  const scheduleAllTicks = (
    ctx: AudioContext,
    spinDegrees: number,
    duration: number, // seconds
  ) => {
    cancelScheduledTicks();
    const startTime = ctx.currentTime + 0.05; // small buffer
    const sampleCount = 2000; // resolution of angular sampling
    const degreesPerPocket = 360 / pockets;

    let lastPocketIndex = -1;
    let tickIndex = 0;

    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount; // normalised time [0,1]
      const progress = cubicBezierProgress(t);
      const degrees = progress * spinDegrees;
      const pocketIndex = Math.floor(degrees / degreesPerPocket);

      if (pocketIndex !== lastPocketIndex) {
        const atTime = startTime + t * duration;
        // Alternate frequency slightly for a realistic clacker sound
        const freq = 900 + (tickIndex % 3) * 110;
        scheduleTick(ctx, atTime, freq);
        lastPocketIndex = pocketIndex;
        tickIndex++;
      }
    }
  };

  // Spin zawsze w TYM SAMYM kierunku i ze STAŁĄ liczbą obrotów
  const spinToPocket = async (targetIndex: number | null) => {
    if (targetIndex == null) return;
    if (isSpinning) return;

    setIsSpinning(true);

    const pocketCenter = targetIndex * anglePerPocket + anglePerPocket / 2;
    const desiredAngleAtTop = (360 - pocketCenter) % 360;

    //Fake rotations
    const fullRotations = 6;

    const currentMod = ((totalRotationRef.current % 360) + 360) % 360;
    const delta = (desiredAngleAtTop - currentMod + 360) % 360;

    //Final angle ( current + fake full rotations + delta to chosen pocket)
    const finalRotation =
      totalRotationRef.current + fullRotations * 360 + delta;

    const duration = 2.8; // seconds

    // Schedule all ticks upfront using Web Audio clock for perfect timing
    const ctx = getAudioCtx();
    if (ctx) {
      const spinDegrees = finalRotation - totalRotationRef.current;
      scheduleAllTicks(ctx, spinDegrees, duration);
    }

    await controls.start(
      { rotate: finalRotation },
      { duration, ease: [0.22, 0.61, 0.36, 1] },
    );

    // Cancel any remaining (unplayed) scheduled nodes after wheel stops
    cancelScheduledTicks();

    totalRotationRef.current = finalRotation;

    setIsSpinning(false);
    onSpinEnd?.(rouletteSequence[targetIndex]);
  };

  useEffect(() => {
    if (typeof targetNumber === "number") {
      const idx = rouletteSequence.indexOf(targetNumber);
      if (idx !== -1) spinToPocket(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetNumber]);

  //---SVG wheel---
  const radius = size / 2;
  const innerRadius = radius * 0.62;

  const pocketsArr = Array.from(
    { length: pockets },
    (_, i) => rouletteSequence[i],
  );

  return (
    <div style={{ width: size * 1.2, position: "relative" }}>
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: size * 1.125,
          height: size * 1.125,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "#1a1a1a",
          boxShadow: "0 0 40px rgba(0,0,0,0.1), inset 0 0 40px rgba(0,0,0,0.5)",
          zIndex: 0,
        }}
      />

      {/* Pointer */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: -10,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: "16.5px solid #ffbf00",
            transform: "rotate(180deg)",
          }}
        />
      </div>

      <motion.div
        animate={controls}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "visible",
          position: "relative",
          zIndex: 10,
          margin: "0 auto",
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`translate(${radius}, ${radius})`}>
            {pocketsArr.map((number, idx) => {
              // Add a small overlap to prevent gaps (0.5 degrees)
              const overlap = 0.1 * (Math.PI / 180);
              const startAngle =
                (idx * anglePerPocket - 90) * (Math.PI / 180) - overlap;
              const endAngle =
                ((idx + 1) * anglePerPocket - 90) * (Math.PI / 180) + overlap;

              const x1 = Math.cos(startAngle) * radius;
              const y1 = Math.sin(startAngle) * radius;
              const x2 = Math.cos(endAngle) * radius;
              const y2 = Math.sin(endAngle) * radius;

              const xi1 = Math.cos(startAngle) * innerRadius;
              const yi1 = Math.sin(startAngle) * innerRadius;
              const xi2 = Math.cos(endAngle) * innerRadius;
              const yi2 = Math.sin(endAngle) * innerRadius;

              const path = `M ${xi1} ${yi1} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerRadius} ${innerRadius} 0 0 0 ${xi1} ${yi1}`;

              // Calculate angle for label rotation and position
              const labelAngle =
                (idx * anglePerPocket + anglePerPocket / 2 - 90) *
                (Math.PI / 180);
              const labelRadius = radius - (radius - innerRadius) * 0.25; // Position closer to outer edge
              const lx = Math.cos(labelAngle) * labelRadius;
              const ly = Math.sin(labelAngle) * labelRadius;

              // Calculate rotation for the text to be parallel to the circle
              const rotationAngle = (labelAngle * 180) / Math.PI + 90;

              return (
                <g key={idx}>
                  <path d={path} fill={defaultColors(number)} />
                  <text
                    x={lx}
                    y={ly}
                    fill="#fff"
                    fontSize={fontSizeProp}
                    fontWeight={700}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${rotationAngle}, ${lx}, ${ly})`}
                  >
                    {number}
                  </text>
                </g>
              );
            })}

            {/* overlay circle for shadow effect */}
            <circle r={radius / 1.22} fill="black" fillOpacity={0.35} />
            <circle r={radius / 1.61} fill="#0C0A08" fillOpacity={1} />
            <rect
              width={radius / 18}
              height={radius - 50}
              x={-(radius / 36)}
              y={-(radius / 2) + 25}
              fill="#ffbf00"
              fillOpacity={1}
              rx={100}
              ry={100}
            />
            <rect
              width={radius / 18}
              height={radius - 50}
              x={-(radius / 36)}
              y={-(radius / 2) + 25}
              fill="#ffbf00"
              fillOpacity={1}
              transform="rotate(90)"
              rx={100}
              ry={100}
            />
            <motion.circle
              cx={radius / 3}
              cy={0}
              r={radius / 32}
              fill="#ffbf00"
              fillOpacity={1}
            />
            <motion.circle
              cx={0}
              cy={-radius / 3}
              r={radius / 32}
              fill="#ffbf00"
              fillOpacity={1}
            />
            <motion.circle
              cx={0}
              cy={radius / 3}
              r={radius / 30}
              fill="#ffbf00"
              fillOpacity={1}
            />
            <motion.circle
              cx={-radius / 3}
              cy={0}
              r={radius / 30}
              fill="#ffbf00"
              fillOpacity={1}
            />
            <circle r={radius / 10} fill="#ffbf00" fillOpacity={1} />
            <circle r={radius / 20} fill="#0C0A08" fillOpacity={1} />
            {/* center */}
          </g>
        </svg>
      </motion.div>
    </div>
  );
};

export default AnimatedWheel;
