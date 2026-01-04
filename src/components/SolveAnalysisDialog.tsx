import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CFOPStats } from "@/lib/cfop-analyzer";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatTime, MoveEvent } from "@/types/cube";

interface SolveAnalysisDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stats: CFOPStats | null;
    scramble?: string[]; // Add scramble prop for debug
    debugHistory?: MoveEvent[]; // Add history for debug
}

const SolveAnalysisDialog = ({ open, onOpenChange, stats, scramble, debugHistory }: SolveAnalysisDialogProps) => {
    if (!stats) return null;

    const data = [
        { name: 'Cross', time: stats.cross.duration, moves: stats.cross.moveCount, color: '#FFFFFF' },
        { name: 'F2L', time: stats.f2l.duration, moves: stats.f2l.moveCount, color: '#4ade80' },
        { name: 'OLL', time: stats.oll.duration, moves: stats.oll.moveCount, color: '#facc15' },
        { name: 'PLL', time: stats.pll.duration, moves: stats.pll.moveCount, color: '#ef4444' },
    ];

    const totalTime = stats.cross.duration + stats.f2l.duration + stats.oll.duration + stats.pll.duration;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                    <p className="font-bold mb-1">{label}</p>
                    <div className="space-y-1 text-sm">
                        <p>Time: <span className="font-mono">{formatTime(data.time)}</span></p>
                        <p>Moves: <span className="font-mono">{data.moves}</span></p>
                        <p>TPS: <span className="font-mono">{data.time > 0 ? (data.moves / (data.time / 1000)).toFixed(2) : 0}</span></p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md md:max-w-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <span>🎉 Solve Analysis</span>
                        <span className="text-muted-foreground text-base font-normal">
                            ({formatTime(totalTime)})
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-8 py-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-2 md:gap-4">
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

                    {/* Chart */}
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    width={50}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="time" radius={[0, 4, 4, 0]} barSize={32}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Detailed TPS Info */}
                    <div className="rounded-xl bg-muted/20 p-4 border border-border/50">
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
                <div className="space-y-2 mt-4 p-4 bg-muted/20 rounded-lg text-xs font-mono text-muted-foreground overflow-hidden">
                    <div className="font-bold">Debug Info</div>
                    <div>Base Face: {stats.baseFace || 'None Detected'}</div>
                    <div>CFOP Detected: {stats.isCfop ? 'Yes' : 'No'}</div>
                    <div>Scramble: {scramble?.join(' ')}</div>
                    <div>History Length: {debugHistory?.length || 0}</div>
                    <div>Steps: Cross={stats.cross.moveCount}, F2L={stats.f2l.moveCount}, OLL={stats.oll.moveCount}, PLL={stats.pll.moveCount}</div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SolveAnalysisDialog;
