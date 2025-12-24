import { useState, useRef, useCallback, useEffect } from 'react';
import { TimerState } from '@/types/cube';

interface UseTimerReturn {
  time: number;
  timerState: TimerState;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  formattedTime: string;
}

export const useTimer = (): UseTimerReturn => {
  const [time, setTime] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const centiseconds = Math.floor((ms % 1000) / 10);

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}.${centiseconds.toString().padStart(2, '0')}`;
  }, []);

  const startTimer = useCallback(() => {
    if (timerState === 'running') return;
    
    setTimerState('running');
    startTimeRef.current = Date.now() - time;
    
    intervalRef.current = window.setInterval(() => {
      setTime(Date.now() - startTimeRef.current);
    }, 10);
  }, [timerState, time]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerState('stopped');
  }, []);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTime(0);
    setTimerState('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    time,
    timerState,
    startTimer,
    stopTimer,
    resetTimer,
    formattedTime: formatTime(time),
  };
};
