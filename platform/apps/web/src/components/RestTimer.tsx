import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch {
    /* ignore */
  }
  if ('vibrate' in navigator) navigator.vibrate?.([300, 100, 300]);
}

/**
 * Bottom-fixed rest timer used across the workout day page.
 * Counts down from `seconds`, beeps + vibrates on finish.
 */
export function RestTimer({
  seconds,
  onClose,
  onFinish,
}: {
  seconds: number;
  onClose: () => void;
  onFinish?: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  const initial = useRef(seconds);
  const finishedRef = useRef(false);

  useEffect(() => {
    initial.current = seconds;
    setRemaining(seconds);
    setRunning(true);
    finishedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!finishedRef.current) {
            finishedRef.current = true;
            beep();
            onFinish?.();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onFinish]);

  const progress = initial.current ? (remaining / initial.current) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-4"
      >
        <div className="mx-auto max-w-md rounded-2xl border border-accent-700/40 bg-ink-900/95 p-4 shadow-glow backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-ink-300">Rest</div>
              <div className="display text-4xl">{formatTime(remaining)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setRunning((r) => !r)}
                aria-label={running ? 'Pause' : 'Resume'}
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setRemaining(initial.current);
                  setRunning(true);
                  finishedRef.current = false;
                }}
                aria-label="Reset"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose} aria-label="Skip / close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full bg-accent-400 transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
