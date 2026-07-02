import React, { useState, useEffect, useRef } from 'react';

const CHARS = 'アイウエオABCDEFGHIJKLMNOPQRSTUVWXYZ01%#@$&';
const DIGITS = '0123456789';

function morphChar(): string {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function morphDigit(): string {
  return DIGITS[Math.floor(Math.random() * DIGITS.length)];
}

interface GlitchNumberProps {
  value: number | string;
  color?: string;
  fontSize?: number | string;
  fontWeight?: number | string;
  glitchColor?: string;
  intensity?: number;
}

export default function GlitchNumber({
  value,
  color = '#00ff88',
  fontSize = 28,
  fontWeight = 700,
  glitchColor = '#ff6ec7',
  intensity = 0.5,
}: GlitchNumberProps) {
  const display = String(value);
  const [glitched, setGlitched] = useState(display);
  const [isGlitching, setIsGlitching] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const mounted = useRef(true);

  useEffect(() => {
    if (mounted.current) setGlitched(String(value));
    return () => { mounted.current = false; };
  }, [value]);

  useEffect(() => {
    mounted.current = true;
    // Glitch burst: random characters appear briefly
    const burst = () => {
      if (!mounted.current) return;
      // Time the glitch: 60-150ms burst
      const len = String(value).length;
      const glitchStr = Array.from({ length: len }, () => morphDigit()).join('');
      setGlitched(glitchStr);
      setIsGlitching(true);
      setStyle({
        transform: `translateX(${(Math.random() - 0.5) * 3}px) skewX(${(Math.random() - 0.5) * 2}deg)`,
        textShadow: `0 0 ${6 + Math.random() * 10}px ${glitchColor}, ${(Math.random() - 0.5) * 6}px ${(Math.random() - 0.5) * 4}px rgba(255,110,199,0.4)`,
      });
      const dur = 60 + Math.random() * 120;
      setTimeout(() => {
        if (mounted.current) {
          setGlitched(String(value));
          setIsGlitching(false);
          setStyle({});
        }
      }, dur);
    };

    // Morph sequence (longer): characters cycle through random chars
    const morph = () => {
      if (!mounted.current) return;
      const len = String(value).length;
      let steps = 0;
      const maxSteps = 3 + Math.floor(Math.random() * 4);
      const step = () => {
        if (!mounted.current || steps >= maxSteps) {
          setGlitched(String(value));
          setIsGlitching(false);
          setStyle({});
          return;
        }
        const mStr = Array.from({ length: len }, () => morphDigit()).join('');
        setGlitched(mStr);
        setIsGlitching(true);
        setStyle({
          transform: `rotate(${(Math.random() - 0.5) * 4}deg) scale(${0.95 + Math.random() * 0.1})`,
          textShadow: `0 0 ${8 + steps * 4}px ${glitchColor}`,
        });
        steps++;
        setTimeout(step, 30 + Math.random() * 50);
      };
      step();
    };

    const t1 = setInterval(() => { if (Math.random() < intensity) burst(); }, 1500 + Math.random() * 2500);
    const t2 = setInterval(() => { if (Math.random() < 0.3) morph(); }, 6000 + Math.random() * 8000);
    return () => { mounted.current = false; clearInterval(t1); clearInterval(t2); };
  }, [value]);

  return (
    <span style={{
      color: isGlitching ? glitchColor : color,
      fontSize,
      fontWeight,
      fontFamily: "'JetBrains Mono', monospace",
      textShadow: isGlitching ? undefined : `0 0 12px ${color}44`,
      transition: 'color 0.03s, transform 0.03s',
      display: 'inline-block',
      ...style,
    }}>{glitched}</span>
  );
}
