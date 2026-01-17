import { useState, useMemo, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, FastForward } from 'lucide-react';
import RubiksCube3D from './RubiksCube3D';
import { applyMove } from '@/lib/cube-solver.ts';
import { createSolvedCube, CubeState, MoveEvent, isCubeSolved, Facelets, CubeFace } from '@/types/cube';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CFOPStats } from '@/lib/cfop-analyzer';

interface ReplayStep {
    notation: string;
    moves: MoveEvent[]; // The original moves that make up this step (e.g. U, U for U2)
    timestamp: number;
    orientation?: { x: number, y: number, z: number };
}

interface SolveAnalysisDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stats: CFOPStats | null;
    scramble: string[];
    debugHistory: MoveEvent[];
    scrambleMoves?: MoveEvent[]; // Actual scramble moves from moveHistory for accurate replay
}

const formatTime = (ms: number) => {
    const seconds = ms / 1000;
    return seconds.toFixed(2) + 's';
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                <p className="text-sm font-bold">{payload[0].payload.name}</p>
                <p className="text-xs text-muted-foreground">
                    {formatTime(payload[0].value)} ({payload[0].payload.moves} moves)
                </p>
            </div>
        );
    }
    return null;
};

const SolveAnalysisDialog = ({ open, onOpenChange, stats, scramble, debugHistory, scrambleMoves }: SolveAnalysisDialogProps) => {

    // Replay State
    const [replayIndex, setReplayIndex] = useState(0); // 0 = Scrambled state, N = After Nth step
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(500); // ms per step

    // Process History into Simplified Steps (R + R -> R2)
    const replaySteps = useMemo(() => {
        if (!debugHistory) return [];

        console.log('[Dialog] Received props:', {
            scramble: scramble?.join(' '),
            historyLength: debugHistory.length,
            firstMove: debugHistory[0]?.notation,
            lastMove: debugHistory[debugHistory.length - 1]?.notation
        });

        const steps: ReplayStep[] = [];
        let i = 0;

        while (i < debugHistory.length) {
            const current = debugHistory[i];
            let next = i + 1 < debugHistory.length ? debugHistory[i + 1] : null;

            // Check for double move (Same face, same direction)
            // Note: Gan cubes send two moves for double turns usually.
            // U + U -> U2. U' + U' -> U2.
            if (next && next.face === current.face && next.direction === current.direction) {
                // Double move detected
                steps.push({
                    notation: `${current.face}2`,
                    moves: [current, next],
                    timestamp: next.timestamp,
                    orientation: next.orientation
                });
                i += 2;
            } else {
                // Single move
                steps.push({
                    notation: current.notation,
                    moves: [current],
                    timestamp: current.timestamp,
                    orientation: current.orientation
                });
                i += 1;
            }
        }
        return steps;
    }, [debugHistory]);

    // Compute Facelets for current index
    // Use actual scramble moves from moveHistory for accurate replay
    const currentFacelets = useMemo(() => {
        // Always start from solved cube
        let f: Facelets = createSolvedCube();
        
        // Apply actual scramble moves if available (most accurate)
        // These are the moves the user performed on the physical cube
        if (scrambleMoves && scrambleMoves.length > 0) {
            scrambleMoves.forEach(move => {
                f = applyMove(f, move.face, move.direction);
            });
            console.log('[Replay] Applied', scrambleMoves.length, 'actual scramble moves');
        } else if (scramble && scramble.length > 0) {
            // Fallback: Apply scramble from notation
            scramble.forEach(moveStr => {
                const face = moveStr[0] as CubeFace;
                const isPrime = moveStr.includes("'");
                const isDouble = moveStr.includes("2");
                const direction: 1 | -1 = isPrime ? -1 : 1;

                f = applyMove(f, face, direction);
                if (isDouble) {
                    f = applyMove(f, face, direction);
                }
            });
            console.log('[Replay] Applied scramble from notation (fallback)');
        }

        // Apply solve moves
        let rawMoveCount = 0;
        for (let i = 0; i < Math.min(replayIndex, replaySteps.length); i++) {
            const step = replaySteps[i];
            step.moves.forEach(m => {
                f = applyMove(f, m.face, m.direction);
                rawMoveCount++;
            });
        }

        const atEnd = replayIndex >= replaySteps.length;
        const solved = isCubeSolved(f);

        // Debug only at end
        if (atEnd) {
            console.log('[Replay] At end:', {
                solved,
                scrambleMovesUsed: scrambleMoves?.length || 0,
                solveMoves: rawMoveCount
            });
        }

        return f;
    }, [scramble, scrambleMoves, replayIndex, replaySteps]);

    // Current Orientation
    const currentOrientation = useMemo(() => {
        if (replayIndex === 0) return { x: 30, y: 45, z: 0 }; // Default view
        const step = replaySteps[replayIndex - 1];
        if (step && step.orientation) {
            return step.orientation;
        }
        // Fallback to previous known or default
        return { x: 30, y: 45, z: 0 };
    }, [replayIndex, replaySteps]);

    // Playback Loop
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setReplayIndex(prev => {
                    if (prev >= replaySteps.length) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, playbackSpeed);
        }
        return () => clearInterval(interval);
    }, [isPlaying, replaySteps.length, playbackSpeed]);

    if (!stats) return null;

    // Chart data
    const totalTime = stats.cross.duration + stats.f2l.duration + stats.oll.duration + stats.pll.duration;
    const data = [
        { name: 'Cross', time: stats.cross.duration, moves: stats.cross.moveCount, color: 'hsl(var(--chart-1))' },
        { name: 'F2L', time: stats.f2l.duration, moves: stats.f2l.moveCount, color: 'hsl(var(--chart-2))' },
        { name: 'OLL', time: stats.oll.duration, moves: stats.oll.moveCount, color: 'hsl(var(--chart-3))' },
        { name: 'PLL', time: stats.pll.duration, moves: stats.pll.moveCount, color: 'hsl(var(--chart-4))' },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md md:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    {/* ... existing header ... */}
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <span>🎉 Solve Analysis</span>
                        <span className="text-muted-foreground text-base font-normal">
                            ({formatTime(totalTime)})
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Column: Stats */}
                    <div className="flex-1 space-y-8 py-4">
                        {/* ... existing stats grid, chart, tps ... */}
                        <div className="grid grid-cols-4 gap-2 md:gap-4">
                            {/* ... same stats code ... */}
                            {data.map((item) => (
                                <div key={item.name} className="bg-muted/30 p-3 rounded-xl border border-border/50 text-center">
                                    <div className="text-xs text-muted-foreground mb-1">{item.name}</div>
                                    <div className="font-bold text-lg md:text-xl font-mono">
                                        {formatTime(item.time)}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {item.moves} moves
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="h-[200px] w-full">
                            {/* ... same chart code ... */}
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={50} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="time" radius={[0, 4, 4, 0]} barSize={32}>
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* TPS Box */}
                        <div className="rounded-xl bg-muted/20 p-4 border border-border/50">
                            {/* ... existing TPS content ... */}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Total Moves</span>
                                <span className="font-mono font-bold">{stats.totalMoveCount}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-2">
                                <span className="text-muted-foreground">Average TPS</span>
                                <span className="font-mono font-bold">
                                    {(stats.totalMoveCount / (totalTime / 1000)).toFixed(2)}
                                </span>
                            </div>
                            {!stats.isCfop && (
                                <div className="mt-4 text-xs text-warning flex items-center gap-2">
                                    Note: The detected steps may not align perfectly with CFOP (steps skipped or done out of order).
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Replay */}
                    <div className="flex-1 md:max-w-[400px] flex flex-col gap-4">
                        <div className="font-bold text-lg mb-2">Replay Solve</div>

                        {/* 3D Cube Container */}
                        <div className="aspect-square w-full rounded-2xl overflow-hidden bg-black/5 border border-white/5 relative">
                            <RubiksCube3D
                                facelets={currentFacelets}
                                orientation={currentOrientation}
                                axisConfig={{
                                    xSource: 'x',
                                    ySource: 'z',
                                    zSource: 'y',
                                    xInvert: true,
                                    yInvert: false,
                                    zInvert: true,
                                    gyroEnabled: false,
                                    offsetX: 0,
                                    offsetY: 0,
                                    offsetZ: 0,
                                    offsetQuaternion: null,
                                    quality: 'high',
                                }}
                                isError={false}
                            />

                            {/* Overlay Info */}
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-lg p-2 text-xs text-white font-mono pointer-events-none">
                                <div>Move: {replayIndex} / {replaySteps.length}</div>
                                <div className="text-xl font-bold text-primary mt-1">
                                    {replayIndex > 0 ? replaySteps[replayIndex - 1].notation : 'Start'}
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                            <div className="flex items-center justify-between gap-2">
                                <Button size="icon" variant="ghost" onClick={() => setReplayIndex(0)} title="Reset">
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setReplayIndex(Math.max(0, replayIndex - 1))}>
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                                <Button size="icon" variant="default" className="rounded-full w-12 h-12" onClick={() => setIsPlaying(!isPlaying)}>
                                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setReplayIndex(Math.min(replaySteps.length, replayIndex + 1))}>
                                    <ChevronRight className="w-5 h-5" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => { setIsPlaying(false); setReplayIndex(replaySteps.length); }} title="End">
                                    <FastForward className="w-4 h-4" />
                                </Button>
                            </div>

                            <Slider
                                value={[replayIndex]}
                                max={replaySteps.length}
                                step={1}
                                onValueChange={(v) => { setIsPlaying(false); setReplayIndex(v[0]); }}
                                className="w-full"
                            />

                            <div className="text-center text-xs text-muted-foreground font-mono">
                                {replaySteps.map((s, i) => (
                                    <span key={i} className={`inline-block mx-0.5 px-1 rounded ${i === replayIndex - 1 ? 'bg-primary text-primary-foreground font-bold scale-110' : 'opacity-50'}`}>
                                        {s.notation}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 mt-4 p-4 bg-muted/20 rounded-lg text-xs font-mono text-muted-foreground overflow-hidden">
                    <div className="font-bold">Debug Info</div>
                    {/* ... existing debug info ... */}
                    <div>Base Face: {stats.baseFace || 'None Detected'}</div>
                    <div>CFOP Detected: {stats.isCfop ? 'Yes' : 'No'}</div>
                    <div>Scramble: {scramble?.join(' ')}</div>
                    <div>Run Details: {isPlaying ? 'Playing' : 'Paused'} at {replayIndex}</div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SolveAnalysisDialog;
