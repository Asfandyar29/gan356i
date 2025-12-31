import { useState, useCallback, useEffect, Suspense } from 'react';
import { useCubeConnection } from '@/hooks/useCubeConnection';
import { useTimer } from '@/hooks/useTimer';
import { generateScramble, isCubeSolved, createSolvedCube, CubeState } from '@/types/cube';
import ConnectPrompt from '@/components/ConnectPrompt';
import ControlPanel from '@/components/ControlPanel';
import TimerDisplay from '@/components/TimerDisplay';
import ScrambleDisplay from '@/components/ScrambleDisplay';
import CubeStats from '@/components/CubeStats';
import RubiksCube3D from '@/components/RubiksCube3D';

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
  });

  // Demo mode rotation animation
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
    resetTimer();
  }, [resetTimer]);

  // Active state (real connection or demo)
  const activeState = isDemoMode ? demoState : cubeState;
  const isConnected = isDemoMode || connectionState === 'connected';

  // Check if cube is solved and handle timer
  useEffect(() => {
    if (!isConnected) return;

    const solved = isCubeSolved(activeState.facelets);

    // If cube is scrambled and we detect a first move, start timer
    if (scrambleFollowed && timerState === 'idle' && activeState.moveCount > 0 && !solved) {
      startTimer();
    }

    // If cube is solved while timer is running, stop timer
    if (timerState === 'running' && solved) {
      stopTimer();
    }
  }, [activeState, isConnected, scrambleFollowed, timerState, startTimer, stopTimer]);

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

        {/* Scramble Display */}
        {scramble.length > 0 && (
          <div className="animate-scale-in space-y-4">
            <ScrambleDisplay scramble={scramble} />
            {!scrambleFollowed && (
              <div className="text-center">
                <button
                  onClick={handleMarkScrambleFollowed}
                  className="px-6 py-2 rounded-lg bg-success/20 text-success border border-success/30 hover:bg-success/30 transition-colors font-medium"
                >
                  I've followed the scramble - Ready to solve!
                </button>
              </div>
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
              />
            </Suspense>
          </div>
        </div>

        {/* Stats */}
        <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
          <CubeStats cubeState={activeState} />
        </div>

        {/* Status indicator */}
        {timerState === 'stopped' && (
          <div className="text-center animate-scale-in">
            <div className="inline-block px-6 py-3 rounded-xl bg-success/10 border border-success/30">
              <span className="text-success font-bold text-xl">
                🎉 Solved in {formattedTime}!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Index = () => {
  return <CubeTracker />;
};

export default Index;
