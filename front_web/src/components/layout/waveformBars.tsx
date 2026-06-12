import React, { useEffect, useRef } from 'react'

const MAX_H = [0.12, 0.22, 0.42, 0.62, 0.80, 0.90, 0.96, 1.0, 1.0, 0.97, 0.90, 0.82, 0.70, 0.55, 0.38, 0.23, 0.13, 0.07];

const WaveformBars = ({ active, low }: { active: boolean; low: boolean }) => {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef  = useRef<number | null>(null);
  const tRef    = useRef(0);
  const phasesRef = useRef(MAX_H.map(() => Math.random() * Math.PI * 2));
  const speedsRef = useRef(MAX_H.map(() => 0.8 + Math.random() * 1.4));

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      barsRef.current.forEach(b => { if (b) b.style.transform = 'scaleY(0.07)'; });
      return;
    }
    const phases = phasesRef.current;
    const speeds = speedsRef.current;
    function tick() {
      tRef.current += 0.04;
      barsRef.current.forEach((b, i) => {
        if (!b) return;
        const maxVal = low ? MAX_H[i] * 0.25 : MAX_H[i];
        const scale  = 0.07 + (maxVal - 0.07) * (0.5 + 0.5 * Math.sin(tRef.current * speeds[i] + phases[i]));
        b.style.transform = `scaleY(${scale.toFixed(3)})`;
      });
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, low]);

  const gradient = low
    ? 'linear-gradient(to top, #D97706, #F59E0B)'
    : 'linear-gradient(to top, #0E86E8, #6B35C9)';

  return (
    <div className="flex justify-center items-center gap-[3px] mb-5" style={{ height: 40 }}>
      {Array.from({ length: 18 }, (_, i) => (
        <div
          key={i}
          ref={el => { barsRef.current[i] = el; }}
          style={{ width: 4, height: 40, borderRadius: 2, background: gradient,
            transform: 'scaleY(0.07)', transformOrigin: 'center', flexShrink: 0 }}
        />
      ))}
    </div>
  );
}

export default WaveformBars
