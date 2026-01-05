import { useState, useCallback, useEffect, Suspense, useRef, useMemo } from 'react';
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

  const { time, timerState, startTimer, stopTimer, resetTimer, formattedTime } = useTimer();
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
    resetTimer();

    // Reset inspection timer
    if (inspectionIntervalRef.current) {
      clearInterval(inspectionIntervalRef.current);
      inspectionIntervalRef.current = null;
    }
  }, [resetTimer]);

  // Active state (real connection or demo)
  const activeState = isDemoMode ? demoState : cubeState;
  const isConnected = isDemoMode || connectionState === 'connected';

  // --- Guided Scrambling Logic ---
  useEffect(() => {
    if (!activeState.lastMove || scramble.length === 0 || scrambleFollowed) return;

    const targetMove = scramble[scrambleIndex];
    // Compare notation (e.g. "R", "R'", "R2")
    // Note: Our move event provides 'notation' which is "R" or "R'".
    // Scramble might have "R2". "R2" can be solved by doing "R" then "R".
    // Or if the user does "R2" (double turn) directly? The cube usually reports two "R" events quickly.
    // Let's handle simple matching first.

    const performedMove = activeState.lastMove.notation;

    let isMatch = performedMove === targetMove;

    // Handle "2" moves (e.g. target U2, user does U then U)
    // Complex implementation omitted for robustness, let's stick to 1-move matching.
    // If target is U2, we expect user to do U twice? Or just match U?
    // Let's rely on standard matching. If target is U2, user must do U... wait.
    // If I do U, then U, I get two U events.
    // Currently generator makes standard moves.

    // Simple logic:
    // If target is "R2", and user does "R", we stay on "R2" but maybe mark partial?
    // Let's simplify: Standard 20 move scramble usually has R, R', R2.
    // If target is R2, we wait for TWO R moves?
    // Let's just match exact string for now to be safe, BUT R2 logic needs state.

    // Better approach:
    // Just verify if the move performed is consistent with the target face/direction.
    // If target is R2, user sends R. That is Correct (partial).
    // If target is R, user sends R. Correct (complete).
    // If target is R', user sends R. Incorrect.

    if (targetMove && targetMove.endsWith('2')) {
      // Allow splitting 2 moves
      const base = targetMove[0];
      if (performedMove === base) {
        // It's a match, but we need another one.
        // This requires tracking "partial" state.
        // For now, let's just accept single moves if they match the face/dir.
        // Actually, let's treat '2' as a special case.
        // If we receive "R" and target is "R2", we transform target to "R" for next step?
      }
    }

    // Let's implement EXACT matching for V1 to ensure precision.
    // User must perform the move exactly? No, smart cube sends single moves.
    // If I do R2 fast, I get two R events.
    // So if target is R2:
    // 1. User does R. Match! Remainder is R.
    // 2. User does R. Match! Remainder done.

    // So we need to modify scramble array? No, just track index.
    // If target==R2 and move==R:
    // We increment index? No, we need to track "sub-index".
    // Hack: Modify current scramble item in place? No.

    // Let's assume standard moves R/R'/L/L' etc match perfectly.
    // For '2' moves:
    // If target is X2.
    // If user does X, we treat it as valid, but DON'T advance index yet?
    // We need to mutate the scramble display visually?

    // SIMPLIFICATION:
    // If target is X2, and user does X.
    // We update visual to show 'X' remaining?
    // Let's just advance if it matches face.
    // (This is a loose scramble check, but acceptable for V1).

    // STICK TO STRICT WRITER LOGIC:
    // Comparing `performedMove` to `targetMove`.
    // If target is `R2`, and user does `R`.
    // We treat this as "Correct - Partial".
    // We need to update state to say "1 turn left on current move".
    // For now, let's just use exact string match which means user might get frustrated with R2.
    // REVISION: The `generateScramble` produces R, R', R2.
    // Cube ONLY produces R, R'.
    // So if target is R2, valid inputs are R+R.
    // We handle this by splitting the scramble internally?

    // Let's unpack the scramble into single moves for tracking!
    // Great idea.
  }, [activeState.lastMove]);

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

  // Guided Scramble Check
  useEffect(() => {
    if (!activeState.lastMove || flatScramble.length === 0 || scrambleFollowed) return;
    if (activeState.moveCount === 0) return; // Ignore initial state

    const target = flatScramble[scrambleIndex];
    const move = activeState.lastMove.notation;

    // Check for match
    // Note: Cube 'R' matches Scramble 'R'.
    // Cube "R'" matches Scramble "R'".

    if (move === target) {
      setLastMoveCorrect(true);
      const nextIndex = scrambleIndex + 1;
      setScrambleIndex(nextIndex);

      if (nextIndex >= flatScramble.length) {
        // Scramble Complete!
        setScrambleFollowed(true);
        toast.success("Scramble Complete! Inspection starting...");

        // Start Inspection Timer
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
    } else {
      setLastMoveCorrect(false);
    }
  }, [activeState.moveCount]); // Trigger on move count change to avoid duplicate checks

  // Calculate display index for ScrambleDisplay (mapping flat index back to original R2 etc)
  const displayScrambleIndex = useMemo(() => {
    let flatCount = 0;
    for (let i = 0; i < scramble.length; i++) {
      const move = scramble[i];
      const len = move.endsWith('2') ? 2 : 1;
      if (scrambleIndex < flatCount + len) {
        return i;
      }
      flatCount += len;
    }
    return scramble.length;
  }, [scramble, scrambleIndex]);

  // Ref to track move count when inspection starts
  const movesAtInspectionStart = useRef(0);

  // Capture move count when inspection starts (scramble complete)
  useEffect(() => {
    if (inspectionState === 'running' && movesAtInspectionStart.current === 0) {
      movesAtInspectionStart.current = activeState.moveCount;
    }
    if (inspectionState === 'idle') {
      movesAtInspectionStart.current = 0;
    }
  }, [inspectionState, activeState.moveCount]);

  // Real Timer Start Logic
  useEffect(() => {
    if (timerState !== 'idle' || !scrambleFollowed) return;

    // If we are in inspection mode
    if (inspectionState === 'running' || inspectionState === 'penalty') {
      // If moves have increased since inspection started
      if (activeState.moveCount > movesAtInspectionStart.current && movesAtInspectionStart.current > 0) {
        // Stop inspection
        if (inspectionIntervalRef.current) clearInterval(inspectionIntervalRef.current);
        setInspectionState('idle');

        // Record Start Metadata
        if (activeState.lastMove) {
          solveMetaData.current = {
            index: Math.max(0, activeState.moveHistory.length - 1),
            time: activeState.lastMove.timestamp
          };

          // START TIMER
          startTimer();
        }
      }
    }
  }, [activeState.moveCount, inspectionState, scrambleFollowed, timerState, startTimer, solveMetaData]);

  // Solution Analysis (Stop Timer)
  useEffect(() => {
    if (timerState === 'running' && isCubeSolved(activeState.facelets)) {
      stopTimer();
      // Analyze solve
      // We need to be careful. The solve history starts from `solveMetaData.current.index`.
      // The `startTime` is `solveMetaData.current.time`.

      const history = activeState.moveHistory.slice(solveMetaData.current.index);
      const startTime = solveMetaData.current.time;

      // We pass the ORIGINAL scramble (before flattening) or flattened?
      // `analyzeSolve` expects string array. `scramble` is the source.
      // But we scrambled with `generateScramble`, which might have `R2`.
      // Analyzer handles `R2`.

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

  // Demo mode handler
  const handleDemoMode = useCallback(() => {
    setIsDemoMode(true);
  }, []);

  // Exit demo mode
  const handleExitDemo = useCallback(() => {
    setIsDemoMode(false);
    setScramble([]);
    setScrambleFollowed(false);
    resetTimer();
  }, [resetTimer]);

  // Show connect prompt if not connected and not in demo mode
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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            GAN Cube Tracker
          </h1>
          <p className="text-muted-foreground text-sm">
            {isDemoMode ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                Demo Mode - Connect your cube for full features
              </span>
            ) : (
              'Real-time cube tracking and timing'
            )}
          </p>
        </header>

        {/* Timer */}
        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <TimerDisplay time={formattedTime} isRunning={timerState === 'running'} />
        </div>

        {/* Control Panel */}
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
            }}
            onScramble={handleScramble}
            deviceName={isDemoMode ? 'Demo Cube' : deviceName}
          />
        </div>

        {/* Guided Scramble / Inspection Display */}
        {scramble.length > 0 && (
          <div className="animate-scale-in space-y-4">
            {/* Show Inspection Timer if Active */}
            {inspectionState === 'running' && (
              <div className="text-center animate-pulse">
                <div className={`text-6xl font-bold font-mono ${inspectionTime < 3000 ? 'text-destructive' : inspectionTime < 8000 ? 'text-warning' : 'text-primary'}`}>
                  {(inspectionTime / 1000).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider">Inspection</div>
              </div>
            )}

            {inspectionState === 'penalty' && (
              <div className="text-center">
                <div className="text-4xl font-bold text-destructive">PENALTY</div>
                <div className="text-sm">Start solve immediately!</div>
              </div>
            )}

            {/* Scramble Display (Hidden during solve usually? No keep it) */}
            {timerState === 'idle' && (
              <ScrambleDisplay
                scramble={scramble}
                currentIndex={displayScrambleIndex}
                lastMoveCorrect={lastMoveCorrect}
              />
            )}
          </div>
        )}

        {/* 3D Cube View */}
        <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="card-gradient rounded-2xl p-4 shadow-card overflow-hidden">
            <Suspense fallback={
              <div className="w-full h-[400px] md:h-[500px] flex items-center justify-center">
                <div className="text-muted-foreground">Loading 3D view...</div>
              </div>
            }>
              <RubiksCube3D
                facelets={activeState.facelets}
                orientation={activeState.orientation}
                lastMove={activeState.lastMove}
                nextMove={flatScramble[scrambleIndex]}
              />
            </Suspense>
          </div>
        </div>

        {/* Stats */}
        <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
          <CubeStats cubeState={activeState} />
        </div>

        {/* Status indicator */}
        {timerState === 'stopped' && !analysisOpen && (
          <div className="text-center animate-scale-in">
            <div
              className="inline-block px-6 py-3 rounded-xl bg-success/10 border border-success/30 cursor-pointer hover:bg-success/20 transition-colors"
              onClick={() => setAnalysisOpen(true)}
            >
              <div className="text-success font-bold text-xl">
                🎉 Solved in {formattedTime}!
              </div>
              <div className="text-sm text-success/70">Click for Stats</div>
            </div>
          </div>
        )}
      </div>

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
