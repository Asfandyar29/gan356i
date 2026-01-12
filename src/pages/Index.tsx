import { useState, useCallback, useEffect, Suspense, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import { useCubeConnection } from '@/hooks/useCubeConnection';
import { useTimer } from '@/hooks/useTimer';
import { generateScramble, isCubeSolved, createSolvedCube, CubeState, MoveEvent } from '@/types/cube';
import ConnectPrompt from '@/components/ConnectPrompt';
import ControlPanel from '@/components/ControlPanel';
import TimerDisplay from '@/components/TimerDisplay';
import ScrambleDisplay from '@/components/ScrambleDisplay';
import CubeStats from '@/components/CubeStats';
import RubiksCube3D from '@/components/RubiksCube3D';
import AxisCalibration, { AxisConfig, loadAxisConfig } from '@/components/AxisCalibration';
import SolveAnalysisDialog from '@/components/SolveAnalysisDialog';
import { analyzeSolve, CFOPStats } from '@/lib/cfop-analyzer';
import { toast } from 'sonner';
import NavBar from '@/components/NavBar';
import { getCubeSolution } from '@/lib/solver-service';
import { applyMove as applyMoveLogic } from '@/lib/cube-solver';
import { Play, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';


const CubeTracker = () => {
  const {
    connectionState,
    cubeState,
    connect,
    disconnect,
    resetCube,
    syncCube,
    error,
    deviceName,
    macAddress,
    needsMacAddress,
    pendingDeviceName,
    confirmMacAddress,
    cancelConnection,
    clearMacAddress,
  } = useCubeConnection();

  // Check for WebGL support at the top to follow hook rules
  const webGLSupported = useMemo(() => {
    try {
      if (typeof window === 'undefined') return true;
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }, []);

  const {
    time,
    timerState,
    startTimer,
    stopTimer,
    resetTimer,
    formattedTime,
  } = useTimer();
  const [scramble, setScramble] = useState<string[]>([]);
  const [isScrambled, setIsScrambled] = useState(false);
  const [scrambleFollowed, setScrambleFollowed] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoState, setDemoState] = useState<CubeState>({
    facelets: createSolvedCube(),
    orientation: { x: 0, y: 0, z: 0 },
    batteryLevel: 87,
    moveCount: 0,
    lastMove: null,
    moveHistory: [],
  });

  const [axisConfig, setAxisConfig] = useState<AxisConfig>(loadAxisConfig);
  const handleAxisConfigChange = useCallback((config: AxisConfig) => {
    setAxisConfig(config);
  }, []);

  // Guided Scrambling State
  const [scrambleIndex, setScrambleIndex] = useState(0);
  const [lastMoveCorrect, setLastMoveCorrect] = useState<boolean | null>(null);

  // Inspection State
  const [inspectionState, setInspectionState] = useState<'idle' | 'running' | 'penalty'>('idle');
  const [inspectionTime, setInspectionTime] = useState(15000);
  const inspectionIntervalRef = useRef<number | null>(null);

  const [analysisStats, setAnalysisStats] = useState<CFOPStats | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [solveHistory, setSolveHistory] = useState<MoveEvent[]>([]);

  const solveMetaData = useRef({ index: 0, time: 0 });
  const [isRescueMode, setIsRescueMode] = useState(false);
  const [wrongMoves, setWrongMoves] = useState<string[]>([]);
  const lastProcessedMoveCount = useRef(0);

  // Active state (real connection or demo)
  const activeState = isDemoMode ? demoState : cubeState;
  const isConnected = isDemoMode || connectionState === 'connected';

  useEffect(() => {
    if (!isDemoMode) return;

    const interval = setInterval(() => {
      setDemoState(prev => ({
        ...prev,
        orientation: {
          x: Math.sin(Date.now() / 3000) * 15,
          y: (Date.now() / 50) % 360,
          z: Math.cos(Date.now() / 4000) * 10,
        }
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [isDemoMode]);

  // Generate new scramble
  const handleScramble = useCallback(() => {
    const newScramble = generateScramble();
    setScramble(newScramble);
    setIsScrambled(false);
    setScrambleFollowed(false);
    setScrambleIndex(0);
    setLastMoveCorrect(null);
    setInspectionState('idle');
    setInspectionTime(15000);
    setWrongMoves([]); // Reset wrong moves stack
    resetTimer();

    if (inspectionIntervalRef.current) {
      clearInterval(inspectionIntervalRef.current);
      inspectionIntervalRef.current = null;
    }
  }, [resetTimer]);

  // Unpack scramble on generation for tracking
  const [flatScramble, setFlatScramble] = useState<string[]>([]);
  useEffect(() => {
    const flat: string[] = [];
    scramble.forEach(m => {
      if (m.endsWith('2')) {
        flat.push(m[0]);
        flat.push(m[0]);
      } else {
        flat.push(m);
      }
    });
    setFlatScramble(flat);
  }, [scramble]);

  // DEMO MOVE APPLICATION
  const handleRescue = useCallback(() => {
    if (isCubeSolved(activeState.facelets)) {
      toast.success("Cube is already solved!");
      return;
    }
    const result = getCubeSolution(activeState.facelets);
    if (result.solution) {
      const moves = result.solution.trim().split(/\s+/).filter(Boolean);
      setScramble(moves);
      setIsRescueMode(true);
      setIsScrambled(false);
      setScrambleFollowed(false);
      setScrambleIndex(0);
      setWrongMoves([]);

      // Explicitly stop inspection
      setInspectionState('idle');
      if (inspectionIntervalRef.current) {
        clearInterval(inspectionIntervalRef.current);
        inspectionIntervalRef.current = null;
      }

      toast.success(`Solution found: ${moves.length} moves`);
    } else {
      toast.error(`Solution failed: ${result.error || "Unknown error"}`);
    }
  }, [activeState.facelets]);

  const applyVirtualMove = useCallback((moveStr: string) => {
    if (!isDemoMode || !moveStr) return;

    setDemoState(prev => {
      let newFacelets = [...prev.facelets];
      const face = moveStr[0] as any;
      const isPrime = moveStr.includes("'");
      const isDouble = moveStr.includes("2");
      const direction = isPrime ? -1 : 1;

      newFacelets = applyMoveLogic(newFacelets, face, direction);
      if (isDouble) {
        newFacelets = applyMoveLogic(newFacelets, face, direction);
      }

      const newMoveEvent = {
        face,
        direction: direction as 1 | -1,
        timestamp: Date.now(),
        notation: moveStr, // Simplified for demo
        timeSinceLastMove: 0
      };

      return {
        ...prev,
        facelets: newFacelets,
        moveCount: prev.moveCount + 1,
        lastMove: newMoveEvent,
        moveHistory: [...prev.moveHistory, newMoveEvent]
      };
    });
  }, [isDemoMode]);

  // Auto Follow Logic
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const handleAutoPlay = useCallback(() => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      return;
    }

    if (scramble.length === 0) return;
    setIsAutoPlaying(true);
  }, [isAutoPlaying, scramble.length]);

  // Auto-play effect: applies moves sequentially when active
  useEffect(() => {
    if (!isAutoPlaying || !isDemoMode) return;
    if (scrambleIndex >= flatScramble.length) {
      setIsAutoPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      // Use flatScramble (expanded moves) and let validation useEffect handle increment
      const move = flatScramble[scrambleIndex];
      applyVirtualMove(move);
      // DON'T increment here - the validation useEffect will do it when it sees the correct move
    }, 600); // 600ms delay between moves

    return () => clearTimeout(timer);
  }, [isAutoPlaying, scrambleIndex, flatScramble, applyVirtualMove, isDemoMode]);

  // Stop auto play on completion
  useEffect(() => {
    if (scrambleFollowed && isAutoPlaying) {
      setIsAutoPlaying(false);
    }
  }, [scrambleFollowed, isAutoPlaying]);

  // Stop auto play on exit demo
  useEffect(() => {
    if (!isDemoMode && isAutoPlaying) {
      setIsAutoPlaying(false);
    }
  }, [isDemoMode, isAutoPlaying]);


  // Helper to invert a move string
  const invertMove = (move: string) => {
    if (move.endsWith("'")) return move.slice(0, -1);
    return move + "'";
  };

  // Guided Scramble Check
  useEffect(() => {
    if (!activeState.lastMove || flatScramble.length === 0 || scrambleFollowed) return;
    if (activeState.moveCount === 0) return;
    if (activeState.moveCount === lastProcessedMoveCount.current) return;
    lastProcessedMoveCount.current = activeState.moveCount;

    const move = activeState.lastMove.notation;
    const target = flatScramble[scrambleIndex];

    // Smart Rescue Logic: Recalculate on ANY wrong move
    // Unified Move Validation Logic (Rescue & Scramble)

    // 1. Handle Correction (Undo) if user made a wrong move previously
    if (wrongMoves.length > 0) {
      const lastWrong = wrongMoves[wrongMoves.length - 1];
      // Check if user performed the inverse (correction) of the last wrong move
      if (move === invertMove(lastWrong)) {
        setWrongMoves(prev => {
          const newStack = prev.slice(0, -1);
          // If we cleared all wrong moves, set state to neutral/correct so green arrow returns
          if (newStack.length === 0) setLastMoveCorrect(true);
          return newStack;
        });
      } else {
        // User made ANOTHER wrong move on top of previous ones
        setWrongMoves(prev => [...prev, move]);
      }
      return;
    }

    // 2. Normal Move Validation (No existing errors)
    if (move === target) {
      // Correct Move
      setLastMoveCorrect(true);
      const nextIndex = scrambleIndex + 1;
      setScrambleIndex(nextIndex);

      // Check for Completion
      if (nextIndex >= flatScramble.length) {
        setScrambleFollowed(true);
        if (isRescueMode) {
          // Rescue Complete logic handled by global solved check or standard flow
          if (isCubeSolved(activeState.facelets)) {
            toast.success("Rescue Complete!");
            setIsRescueMode(false);
            setScramble([]);
          }
        } else {
          // Normal Scramble Completion -> Start Inspection
          toast.success("Scramble Complete! Inspection starting...");
          setInspectionState('running');
          setInspectionTime(15000);
          inspectionIntervalRef.current = window.setInterval(() => {
            setInspectionTime(t => {
              if (t <= 0) {
                setInspectionState('penalty');
                if (inspectionIntervalRef.current) clearInterval(inspectionIntervalRef.current);
                return 0;
              }
              return t - 100;
            });
          }, 100);
        }
      }
    } else {
      // Wrong Move (First error)
      setLastMoveCorrect(false);
      setWrongMoves([move]);
    }
  }, [activeState.moveCount, flatScramble, scrambleIndex, scrambleFollowed, wrongMoves, isRescueMode, activeState.facelets]);


  // Robust 'Solved' Check:
  // Whenever the facelets change, check if the cube is solved.
  // If we are in Rescue Mode and the cube becomes solved, exit immediately.
  useEffect(() => {
    if (isRescueMode && isCubeSolved(activeState.facelets)) {
      // Debounce slightly? No, immediate is better for responsiveness.
      // Confirm it's not just an empty state (though isCubeSolved handles that).
      toast.success("Cube Solved!");
      setIsRescueMode(false);
      setScramble([]);
      setScrambleFollowed(false);
      setWrongMoves([]);
    }
  }, [activeState.facelets, isRescueMode]);

  const displayScrambleIndex = useMemo(() => {
    let flatCount = 0;
    for (let i = 0; i < scramble.length; i++) {
      const move = scramble[i];
      const len = move.endsWith('2') ? 2 : 1;
      // If the current progress (scrambleIndex) is WITHIN this move's span
      if (scrambleIndex < flatCount + len) return i;
      flatCount += len;
    }
    return scramble.length;
  }, [scramble, scrambleIndex]);

  // Calculate the actual move to show on the 3D cube
  // If we are halfway through a double move (e.g. U2), we should only show U.
  const getEffectiveNextMove = useCallback(() => {
    if (scramble.length === 0 || scrambleFollowed) return null;

    // Safety check
    if (displayScrambleIndex >= scramble.length) return null;

    const move = scramble[displayScrambleIndex];
    const isDouble = move.endsWith('2');

    if (!isDouble) return move;

    // Calculate start index of this move in the flat array
    let flatStart = 0;
    for (let i = 0; i < displayScrambleIndex; i++) {
      flatStart += scramble[i].endsWith('2') ? 2 : 1;
    }

    // Determine how many parts of this double move are left
    // scrambleIndex is the number of flat moves completed
    const movesCompletedInCurrent = scrambleIndex - flatStart;

    // If we have completed 1 part of a double move, showing 'U2' is wrong. 
    // We should show the base move 'U'.
    if (movesCompletedInCurrent === 1) {
      return move.charAt(0); // 'U2' -> 'U'
    }

    return move;
  }, [scramble, scrambleIndex, displayScrambleIndex, scrambleFollowed]);

  const movesAtInspectionStart = useRef(0);
  useEffect(() => {
    if (inspectionState === 'running' && movesAtInspectionStart.current === 0) {
      movesAtInspectionStart.current = activeState.moveCount;
    }
    if (inspectionState === 'idle') movesAtInspectionStart.current = 0;
  }, [inspectionState, activeState.moveCount]);

  useEffect(() => {
    if (timerState !== 'idle' || !scrambleFollowed) return;
    if (inspectionState === 'running' || inspectionState === 'penalty') {
      if (activeState.moveCount > movesAtInspectionStart.current && movesAtInspectionStart.current > 0) {
        if (inspectionIntervalRef.current) clearInterval(inspectionIntervalRef.current);
        setInspectionState('idle');
        if (activeState.lastMove) {
          // Set index to CURRENT length (next move will be the first solve move)
          solveMetaData.current = {
            index: activeState.moveHistory.length,
            time: activeState.lastMove.timestamp
          };
          console.log('[Timer Start]', {
            startIndex: activeState.moveHistory.length,
            totalMoves: activeState.moveHistory.length,
            lastMoveBeforeStart: activeState.lastMove.notation
          });
          startTimer();
        }
      }
    }
  }, [activeState.moveCount, inspectionState, scrambleFollowed, timerState, startTimer]);

  useEffect(() => {
    if (timerState === 'running' && isCubeSolved(activeState.facelets)) {
      stopTimer();
      const history = activeState.moveHistory.slice(solveMetaData.current.index);
      const startTime = solveMetaData.current.time;

      // Debug: Log what we're capturing
      console.log('[Solve Detection]', {
        totalHistory: activeState.moveHistory.length,
        sliceFrom: solveMetaData.current.index,
        solveHistory: history.length,
        lastMove: history[history.length - 1]?.notation,
        cubeIsSolved: isCubeSolved(activeState.facelets),
        scramble: scramble.join(' ')
      });

      const result = analyzeSolve(scramble, history, startTime);

      // Safety Check for Result
      if (result && !isNaN(result.totalMoveCount)) {
        console.log("[Stats] Analysis Result:", result);
        setAnalysisStats(result);
        setSolveHistory(history); // Store the solve moves for replay
        // Small delay to allow render before opening to prevent potential race/crash?
        requestAnimationFrame(() => setAnalysisOpen(true));
      } else {
        console.error("[Stats] Analysis returned invalid data", result);
        toast.error("Analysis failed: Invalid data");
      }
    }
  }, [activeState.facelets, timerState, stopTimer, scramble, activeState.moveHistory]);

  // Mark scramble as followed when user applies scramble manually
  const handleMarkScrambleFollowed = useCallback(() => {
    setScrambleFollowed(true);
    setIsScrambled(true);
    resetTimer();
  }, [resetTimer]);

  const handleDemoMode = useCallback(() => setIsDemoMode(true), []);
  const handleExitDemo = useCallback(() => {
    setIsDemoMode(false);
    setScramble([]);
    setScrambleFollowed(false);
    setIsRescueMode(false);
    resetTimer();
  }, [resetTimer]);



  // Actually, let's do this cleaner. 
  // I will replace the imports and the whole function in one go properly.


  // Early return for WebGL support
  if (!webGLSupported) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">🎲</div>
          <h2 className="text-xl font-bold">WebGL Required</h2>
          <p className="text-muted-foreground">
            Your browser does not support WebGL, which is required for the 3D cube tracker.
            Please try a modern browser like Chrome or Edge.
          </p>
        </div>
      </div>
    );
  }

  // Early return for Connection
  if (!isConnected || needsMacAddress) {
    return (
      <ConnectPrompt
        onConnect={connect}
        onDemoMode={handleDemoMode}
        isConnecting={connectionState === 'connecting'}
        error={error}
        savedMacAddress={macAddress}
        needsMacAddress={needsMacAddress}
        pendingDeviceName={pendingDeviceName}
        onConfirmMacAddress={confirmMacAddress}
        onCancelConnection={cancelConnection}
        onClearMacAddress={clearMacAddress}
      />
    );
  }

  return (
    <div className="h-screen w-full relative bg-background text-foreground flex flex-col overflow-hidden selection:bg-primary/20">
      <NavBar />

      <main className="flex-1 min-h-0 relative md:flex md:flex-row md:p-6 md:gap-6 max-w-[1600px] mx-auto w-full">
        {/* Left Side: Controls, Timer, Stats
            On Mobile: This becomes an overlay layer on top of the 3D view.
            We use flex-col and justify-between to push Header/Timer to top and Controls/Stats to bottom.
        */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 pb-6 pointer-events-none md:static md:z-auto md:flex md:w-[420px] md:flex-none md:justify-start md:gap-4 md:pointer-events-auto md:overflow-y-auto md:pr-1 md:pb-10 md:p-0">

          {/* Top Section: Header & Timer */}
          <div className="flex flex-col gap-4 pointer-events-auto animate-fade-in">
            <header className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground/90 shadow-black/50 drop-shadow-md md:drop-shadow-none">GAN Cube Tracker</h1>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-black/40 md:bg-transparent rounded-full px-2 py-0.5 md:p-0 w-fit backdrop-blur-sm md:backdrop-filter-none">
                  {isDemoMode ? (
                    <span className="text-warning flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                      Demo Mode
                    </span>
                  ) : (
                    <span className="text-success flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(0,165,80,0.5)]" />
                      Live Tracking
                    </span>
                  )}
                </div>
              </div>
              <AxisCalibration
                onConfigChange={handleAxisConfigChange}
                currentOrientation={activeState.orientation}
                className="relative z-20 flex items-center gap-2"
              />
            </header>

            <div className="glass-surface rounded-3xl p-4 md:p-6 border border-white/5 shadow-xl flex items-center justify-center backdrop-blur-xl" style={{ animationDelay: '100ms' }}>
              <TimerDisplay time={formattedTime} isRunning={timerState === 'running'} />
            </div>

            {/* Analysis Toast Button (Positioned under timer on mobile, normal flow on desktop) */}
            {timerState === 'stopped' && !analysisOpen && (
              <div className="animate-scale-in">
                <div
                  className="w-full p-3 rounded-2xl bg-success/80 md:bg-success/10 backdrop-blur-md border border-success/30 cursor-pointer hover:bg-success/90 md:hover:bg-success/20 transition-all text-center flex items-center justify-center gap-3 group shadow-lg"
                  onClick={() => setAnalysisOpen(true)}
                >
                  <div className="text-white md:text-success font-black text-lg group-hover:scale-105 transition-transform">
                    🎉 {formattedTime}!
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/70 md:text-success/50">Details</div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section: Controls & Stats */}
          {/* On Mobile: Push to bottom, glass background */}
          <div className="flex flex-col gap-3 pointer-events-auto md:gap-4 animate-fade-in mt-auto md:mt-0" style={{ animationDelay: '200ms' }}>
            {/* Stats - Compact on mobile */}
            <div className="glass-surface md:bg-transparent md:border-none md:shadow-none rounded-2xl md:rounded-none p-1 md:p-0 backdrop-blur-xl">
              <CubeStats cubeState={activeState} />
            </div>

            {/* Controls - Horizontal Scroll on small screens if needed */}
            <div className={`
              glass-surface rounded-3xl p-3 md:bg-transparent md:border-none md:shadow-none md:p-0 backdrop-blur-xl
              ${timerState === 'running' ? 'opacity-30 pointer-events-none' : 'opacity-100'} transition-opacity duration-300
            `}>
              <ControlPanel
                connectionState={isDemoMode ? 'connected' : connectionState}
                onConnect={connect}
                onDisconnect={isDemoMode ? handleExitDemo : disconnect}
                onSync={syncCube}
                onReset={() => {
                  if (isDemoMode) {
                    setDemoState({
                      facelets: createSolvedCube(),
                      orientation: { x: 0, y: 0, z: 0 },
                      batteryLevel: 87,
                      moveCount: 0,
                      lastMove: null,
                      moveHistory: [],
                    });
                  } else {
                    resetCube();
                  }
                  resetTimer();
                  setScramble([]);
                  setIsScrambled(false);
                  setScrambleFollowed(false);
                  setWrongMoves([]);
                  setInspectionState('idle');
                  setIsRescueMode(false);
                }}
                onScramble={handleScramble}
                onRescue={handleRescue}
                deviceName={isDemoMode ? 'Demo Cube' : deviceName}
              />
            </div>
          </div>
        </div>

        {/* Right Side: 3D Cube & Overlays
            On Mobile: Background layer (z-0)
         */}
        <div className="absolute inset-0 z-0 md:static md:flex-1 md:flex md:flex-col md:gap-4 md:min-h-0">
          <div className="w-full h-full relative group bg-gradient-to-b from-background via-background/50 to-background md:bg-black/5 md:rounded-[2.5rem] md:p-1 md:border md:border-white/5 md:overflow-hidden md:ring-1 md:ring-white/5">
            {/* Desktop Gradient Overlay */}
            <div className="hidden md:block absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent z-10" />

            <Suspense fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 animate-pulse">Initializing 3D...</div>
                </div>
              </div>
            }>
              <div className="h-full w-full">
                <RubiksCube3D
                  axisConfig={axisConfig}
                  facelets={activeState.facelets}
                  orientation={activeState.orientation}
                  lastMove={activeState.lastMove}
                  nextMove={
                    // Priority Logic for 3D Guide:
                    // 1. If Wrong Move Exists (Any Mode) -> Show UNDO arrow (RED)
                    // 2. Else -> Show Next Sequence Move (GREEN)
                    (() => {
                      if (wrongMoves.length > 0) {
                        const lastWrong = wrongMoves[wrongMoves.length - 1];
                        return invertMove(lastWrong); // e.g., if user did U, show U'
                      }
                      return getEffectiveNextMove();
                    })()
                  }
                  isError={wrongMoves.length > 0}
                />
              </div>
            </Suspense>

            {/* Rescue Mode Large Indicator */}
            {isRescueMode && !isCubeSolved(activeState.facelets) && (
              <div className="absolute top-24 md:top-6 left-6 right-6 z-30 flex flex-col items-center animate-fade-in pointer-events-none">
                <div className="bg-primary/20 backdrop-blur-md border border-primary/30 rounded-2xl px-6 py-4 shadow-xl mb-4 pointer-events-auto flex flex-col items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
                    RESCUE MODE
                  </span>
                  {getEffectiveNextMove() && (
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                        {getEffectiveNextMove()}
                      </span>
                      <span className="text-xs text-blue-200 font-medium max-w-[120px] leading-tight text-center opacity-80">
                        Follow the arrow or text
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(scramble.length > 0) && (
              <div className="absolute top-40 md:top-20 left-6 right-6 pointer-events-none flex flex-col gap-4 animate-fade-in z-20">
                <div className="pointer-events-auto">
                  {inspectionState === 'running' && !isRescueMode && (
                    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-white/5 text-center mb-4">
                      <div className={`text-5xl font-mono font-black ${inspectionTime < 3000 ? 'text-destructive' : inspectionTime < 8000 ? 'text-warning' : 'text-primary'}`}>
                        {(inspectionTime / 1000).toFixed(1)}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Inspection</div>
                    </div>
                  )}

                  {inspectionState === 'penalty' && !isRescueMode && (
                    <div className="bg-destructive/60 backdrop-blur-sm rounded-2xl p-4 border border-destructive/20 text-center mb-4">
                      <div className="text-2xl font-black text-white">PENALTY</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Start solve immediately!</div>
                    </div>
                  )}

                  {timerState === 'idle' && (
                    <div className="relative group">
                      {(!isCubeSolved(activeState.facelets) && scrambleIndex === 0 && wrongMoves.length === 0 && !isRescueMode) ? (
                        <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/5 text-center">
                          <h3 className="text-[10px] font-black text-destructive uppercase tracking-[0.2em] mb-1">Cube Not Solved</h3>
                          <p className="text-[8px] text-destructive/60 font-medium">Solve the cube to start scramble sequence.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className={`w-full max-w-2xl px-12 relative ${isRescueMode ? 'mt-24' : ''}`}>
                            <ScrambleDisplay
                              scramble={scramble}
                              currentIndex={displayScrambleIndex}
                              lastMoveCorrect={lastMoveCorrect}
                              title={isRescueMode ? "RESCUE SEQUENCE" : "QUICK SCRAMBLE"}
                              onMoveClick={(move, idx) => {
                                if (isDemoMode) {
                                  // Only allow clicking if it's the current move? Or any?
                                  // User wants to debug, so maybe allow any, but standard flow follows index.
                                  // Let's just apply it.
                                  applyVirtualMove(move);
                                }
                              }}
                            />

                            {/* Auto Play Button for Demo */}
                            {isDemoMode && scramble.length > 0 && !scrambleFollowed && (
                              <div className="absolute top-1/2 -left-10 -translate-y-1/2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className={`rounded-full h-8 w-8 ${isAutoPlaying ? 'bg-primary text-white' : 'bg-white/5'}`}
                                  onClick={handleAutoPlay}
                                  title={isAutoPlaying ? "Stop Auto-Follow" : "Auto-Follow"}
                                >
                                  {isAutoPlaying ? <FastForward className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}
                                </Button>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                setScramble([]);
                                setIsScrambled(false);
                                setScrambleFollowed(false);
                                setWrongMoves([]);
                                setInspectionState('idle');
                                setIsRescueMode(false);
                                resetTimer();
                                toast.info("Rescue Mode Cancelled");
                              }}
                              className="absolute top-1/2 -right-2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all z-30"
                              title="Exit"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <SolveAnalysisDialog
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        stats={analysisStats}
        scramble={scramble}
        debugHistory={solveHistory}
      />
    </div>
  );
};

const Index = () => {
  return <CubeTracker />;
};

export default Index;
