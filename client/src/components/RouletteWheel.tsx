import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { rBlack, rGreen, rRed } from '@/lib/utils';

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
  const redSet = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  return redSet.has(i) ? rRed : rBlack;
};

export const AnimatedWheel: React.FC<Props> = ({ pockets = 37, size = 300, targetNumber = null, onSpinEnd, fontSizeProp = 12 }) => {
  const anglePerPocket = 360 / pockets;
  const controls = useAnimation();
  const [isSpinning, setIsSpinning] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tickIntervalRef = useRef<number | null>(null);

  const totalRotationRef = useRef(0)

  const rouletteSequence = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]

  useEffect(() => {
    audioCtxRef.current = null; // lazy init
    return () => {
      if (tickIntervalRef.current) window.clearInterval(tickIntervalRef.current);
    };
  }, []);

  // helper — play small beep (tick)
  const playTick = (freq = 1200, duration = 0.02) => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current!;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.value = 0.0008; // very soft
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + duration);
    } catch {
      // Audio context error - ignore silently
    }
  };

  // Spin zawsze w TYM SAMYM kierunku i ze STAŁĄ liczbą obrotów
  const spinToPocket = async (targetIndex: number | null) => {
    if (targetIndex == null) return
    if (isSpinning) return

    setIsSpinning(true)

    const pocketCenter = targetIndex * anglePerPocket + anglePerPocket / 2
    const desiredAngleAtTop = (360 - pocketCenter) % 360

    //Fake rotations
    const fullRotations = 6

    const currentMod = ((totalRotationRef.current % 360) + 360) % 360
    const delta = ((desiredAngleAtTop - currentMod + 360) % 360)

    //Final angle ( current + fake full rotations + delta to chosen pocket)
    const finalRotation = totalRotationRef.current + fullRotations * 360 + delta

    const duration = 2.8 // default 4.8s

    //Simple tick sound
    const spinDegrees = finalRotation - totalRotationRef.current
    const estimatedPasses = (spinDegrees / 360) * pockets
    const tickEveryMs = Math.max(30, (duration * 1000) / Math.max(estimatedPasses, 1))

    let tickCount = 0
    tickIntervalRef.current = window.setInterval(() => {
      tickCount++
      playTick(1000 + (tickCount % 3) * 120, 0.02)
    }, tickEveryMs)

    await controls.start(
      { rotate: finalRotation },
      { duration, ease: [0.22, 0.61, 0.36, 1] }
    )

    if (tickIntervalRef.current) {
      window.clearInterval(tickIntervalRef.current)
      tickIntervalRef.current = null
    }

    totalRotationRef.current = finalRotation

    setIsSpinning(false)
    onSpinEnd?.(rouletteSequence[targetIndex])
  }

  useEffect(() => {
    if (typeof targetNumber === 'number') {
      const idx = rouletteSequence.indexOf(targetNumber)
      if (idx !== -1) spinToPocket(idx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetNumber])

  //---SVG wheel---
  const radius = size / 2;
  const innerRadius = radius * 0.62;

  const pocketsArr = Array.from({ length: pockets }, (_, i) => rouletteSequence[i]);

  return (
    <div style={{ width: size * 1.2, position: 'relative' }}>
      {/* Backdrop */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: size * 1.125,
        height: size * 1.125,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: '#1a1a1a',
        boxShadow: '0 0 40px rgba(0,0,0,0.1), inset 0 0 40px rgba(0,0,0,0.5)',
        zIndex: 0
      }} />

      {/* Pointer */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        top: -10,
        zIndex: 20,
      }}>
        <div style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '16.5px solid #ffbf00',
          transform: 'rotate(180deg)'
        }} />
      </div>

      <motion.div
        animate={controls}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'visible',
          position: 'relative',
          zIndex: 10,
          margin: '0 auto'
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`translate(${radius}, ${radius})`}>
            {pocketsArr.map((number, idx) => {
              // Add a small overlap to prevent gaps (0.5 degrees)
              const overlap = 0.1 * (Math.PI / 180);
              const startAngle = ((idx * anglePerPocket - 90) * (Math.PI / 180)) - overlap;
              const endAngle = (((idx + 1) * anglePerPocket - 90) * (Math.PI / 180)) + overlap;

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
              const labelAngle = (idx * anglePerPocket + anglePerPocket / 2 - 90) * (Math.PI / 180);
              const labelRadius = radius - (radius - innerRadius) * 0.25; // Position closer to outer edge
              const lx = Math.cos(labelAngle) * labelRadius;
              const ly = Math.sin(labelAngle) * labelRadius;

              // Calculate rotation for the text to be parallel to the circle
              const rotationAngle = (labelAngle * 180 / Math.PI) + 90;

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