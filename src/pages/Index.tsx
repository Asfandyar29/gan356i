import { useState, useCallback, useEffect, Suspense, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import { useCubeConnection } from '@/hooks/useCubeConnection';
import { useTimer } from '@/hooks/useTimer';
import { generateScramble, isCubeSolved, createSolvedCube, CubeState } from '@/types/cube';
import ConnectPrompt from '@/components/ConnectPrompt';
import ControlPanel from '@/components/ControlPanel';
import TimerDisplay from '@/components/TimerDisplay';
import ScrambleDisplay from '@/components/ScrambleDisplay';
import CubeStats from '@/components/CubeStats';
import RubiksCube3D from '@/components/RubiksCube3D';
import SolveAnalysisDialog from '@/components/SolveAnalysisDialog';
import { analyzeSolve, CFOPStats } from '@/lib/cfop-analyzer';
import { toast } from 'sonner';
import NavBar from '@/components/NavBar';
import { getCubeSolution } from '@/lib/solver-service';

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

  // Guided Scrambling State
  const [scrambleIndex, setScrambleIndex] = useState(0);
  const [lastMoveCorrect, setLastMoveCorrect] = useState<boolean | null>(null);

  // Inspection State
  const [inspectionState, setInspectionState] = useState<'idle' | 'running' | 'penalty'>('idle');
  const [inspectionTime, setInspectionTime] = useState(15000);
  const inspectionIntervalRef = useRef<number | null>(null);

  const [analysisStats, setAnalysisStats] = useState<CFOPStats | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

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

    if (wrongMoves.length > 0) {
      const lastWrong = wrongMoves[wrongMoves.length - 1];
      if (move === invertMove(lastWrong)) {
        setWrongMoves(prev => {
          const newStack = prev.slice(0, -1);
          if (newStack.length === 0) setLastMoveCorrect(null);
          return newStack;
        });
      } else {
        setWrongMoves(prev => [...prev, move]);
      }
      return;
    }

    if (move === target) {
      setLastMoveCorrect(true);
      const nextIndex = scrambleIndex + 1;
      setScrambleIndex(nextIndex);

      if (nextIndex >= flatScramble.length) {
        setScrambleFollowed(true);
        if (isRescueMode) {
          toast.success("Cube Solved!");
          setScramble([]);
          setScrambleFollowed(false);
          setIsRescueMode(false);
        } else {
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
      setLastMoveCorrect(false);
      setWrongMoves([move]);
    }
  }, [activeState.moveCount, flatScramble, scrambleIndex, scrambleFollowed, wrongMoves, isRescueMode]);

  const displayScrambleIndex = useMemo(() => {
    let flatCount = 0;
    for (let i = 0; i < scramble.length; i++) {
      const move = scramble[i];
      const len = move.endsWith('2') ? 2 : 1;
      if (scrambleIndex < flatCount + len) return i;
      flatCount += len;
    }
    return scramble.length;
  }, [scramble, scrambleIndex]);

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
          solveMetaData.current = {
            index: Math.max(0, activeState.moveHistory.length - 1),
            time: activeState.lastMove.timestamp
          };
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
      const result = analyzeSolve(scramble, history, startTime);
      setAnalysisStats(result);
      setAnalysisOpen(true);
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

  const handleRescue = useCallback(() => {
    if (isCubeSolved(activeState.facelets)) {
      toast.success("Cube is already solved!");
      return;
    }
    const result = getCubeSolution(activeState.facelets);
    if (result.solution) {
      const moves = result.solution.trim().split(/\s+/);
      setScramble(moves);
      setIsRescueMode(true);
      setIsScrambled(false);
      setScrambleFollowed(false);
      setScrambleIndex(0);
      setWrongMoves([]);
      setInspectionState('idle');
      toast.success(`Solution found: ${moves.length} moves`);
    } else {
      toast.error(`Solution failed: ${result.error || "Unknown error"}`);
    }
  }, [activeState.facelets]);

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

      <main className="flex-1 flex flex-col md:flex-row min-h-0 p-3 md:p-6 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Left Side: Controls, Timer, Stats */}
        <div className="flex-[4] flex flex-col gap-4 overflow-y-auto pr-1 pb-10">
          <header className="flex items-center justify-between gap-4 animate-fade-in">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground/90">GAN Cube Tracker</h1>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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
          </header>

          <div className="glass-surface rounded-3xl p-6 border border-white/5 shadow-xl flex items-center justify-center animate-fade-in" style={{ animationDelay: '100ms' }}>
            <TimerDisplay time={formattedTime} isRunning={timerState === 'running'} />
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
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

          <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CubeStats cubeState={activeState} />
          </div>

          {timerState === 'stopped' && !analysisOpen && (
            <div className="animate-scale-in">
              <div
                className="w-full p-4 rounded-2xl bg-success/10 border border-success/30 cursor-pointer hover:bg-success/20 transition-all text-center flex items-center justify-center gap-3 group"
                onClick={() => setAnalysisOpen(true)}
              >
                <div className="text-success font-black text-lg group-hover:scale-105 transition-transform">
                  🎉 {formattedTime}!
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-success/50">Details</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: 3D Cube & Overlays */}
        <div className="flex-[6] flex flex-col gap-4 min-h-0">
          <div className="flex-1 relative group bg-black/5 rounded-[2.5rem] p-1 border border-white/5 overflow-hidden ring-1 ring-white/5">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent z-10" />

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
                  facelets={activeState.facelets}
                  orientation={activeState.orientation}
                  lastMove={activeState.lastMove}
                  nextMove={scramble.length > 0 && !scrambleFollowed ? scramble[scrambleIndex] : null}
                />
              </div>
            </Suspense>

            {scramble.length > 0 && (
              <div className="absolute top-20 left-6 right-6 pointer-events-none flex flex-col gap-4 animate-fade-in z-20">
                <div className="pointer-events-auto">
                  {inspectionState === 'running' && (
                    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-white/5 text-center mb-4">
                      <div className={`text-5xl font-mono font-black ${inspectionTime < 3000 ? 'text-destructive' : inspectionTime < 8000 ? 'text-warning' : 'text-primary'}`}>
                        {(inspectionTime / 1000).toFixed(1)}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Inspection</div>
                    </div>
                  )}

                  {inspectionState === 'penalty' && (
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
                          <div className="w-full max-w-2xl px-12 relative">
                            <ScrambleDisplay
                              scramble={scramble}
                              currentIndex={displayScrambleIndex}
                              lastMoveCorrect={lastMoveCorrect}
                              title={isRescueMode ? "RESCUE STEPS" : "QUICK SCRAMBLE"}
                            />
                            <button
                              onClick={() => {
                                setScramble([]);
                                setIsScrambled(false);
                                setScrambleFollowed(false);
                                setWrongMoves([]);
                                setInspectionState('idle');
                                setIsRescueMode(false);
                                resetTimer();
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
        debugHistory={activeState.moveHistory}
      />
    </div>
  );
};

const Index = () => {
  return <CubeTracker />;
};

export default Index;
