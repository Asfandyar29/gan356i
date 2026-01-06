import { Battery, Move, Zap } from 'lucide-react';
import { CubeState } from '@/types/cube';

interface CubeStatsProps {
  cubeState: CubeState;
}

const CubeStats = ({ cubeState }: CubeStatsProps) => {
  const { orientation, batteryLevel, moveCount, lastMove } = cubeState;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="glass-surface rounded-3xl p-6 shadow-xl border border-white/5 group hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-3 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest mb-3">
          <Move className="w-3.5 h-3.5" />
          Analytics
        </div>
        <div className="text-3xl font-black text-foreground/90 tracking-tighter">
          {moveCount} <span className="text-xs text-muted-foreground/40 font-bold ml-1 uppercase">Moves</span>
        </div>
      </div>

      <div className="glass-surface rounded-3xl p-6 shadow-xl border border-white/5 group hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-3 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest mb-3">
          <Zap className="w-3.5 h-3.5" />
          Sequence
        </div>
        <div className="text-3xl font-black text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] tracking-tighter">
          {lastMove?.notation || '—'}
        </div>
      </div>

      <div className="glass-surface rounded-3xl p-6 shadow-xl border border-white/5 group hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-3 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest mb-3">
          <Battery className="w-3.5 h-3.5" />
          Power
        </div>
        <div className={`text-3xl font-black tracking-tighter ${batteryLevel > 20 ? 'text-success' : 'text-destructive'}`}>
          {batteryLevel}%
        </div>
      </div>

      <div className="glass-surface rounded-3xl p-6 shadow-xl border border-white/5 group hover:bg-white/10 transition-colors">
        <div className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest mb-3">
          Gyroscope
        </div>
        <div className="flex items-end gap-3 text-xs font-bold leading-none">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground/30 uppercase tracking-tighter">Roll</span>
            <span className="text-cube-red/80">{orientation.x.toFixed(0)}°</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground/30 uppercase tracking-tighter">Pitch</span>
            <span className="text-cube-green/80">{orientation.y.toFixed(0)}°</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground/30 uppercase tracking-tighter">Yaw</span>
            <span className="text-cube-blue/80">{orientation.z.toFixed(0)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CubeStats;
