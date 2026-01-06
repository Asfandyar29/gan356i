import { Battery, Move, Zap } from 'lucide-react';
import { CubeState } from '@/types/cube';

interface CubeStatsProps {
  cubeState: CubeState;
}

const CubeStats = ({ cubeState }: CubeStatsProps) => {
  const { orientation, batteryLevel, moveCount, lastMove } = cubeState;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="glass-surface rounded-2xl p-4 shadow-lg border border-white/5 group hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-2 text-muted-foreground/60 text-[9px] font-black uppercase tracking-widest mb-1.5">
          <Move className="w-3 h-3" />
          Analytics
        </div>
        <div className="text-2xl font-black text-foreground/90 tracking-tighter">
          {moveCount} <span className="text-[10px] text-muted-foreground/40 font-bold ml-0.5 uppercase">Moves</span>
        </div>
      </div>

      <div className="glass-surface rounded-2xl p-4 shadow-lg border border-white/5 group hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-2 text-muted-foreground/60 text-[9px] font-black uppercase tracking-widest mb-1.5">
          <Zap className="w-3 h-3" />
          Sequence
        </div>
        <div className="text-2xl font-black text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] tracking-tighter">
          {lastMove?.notation || '—'}
        </div>
      </div>

      <div className="glass-surface rounded-2xl p-4 shadow-lg border border-white/5 group hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-2 text-muted-foreground/60 text-[9px] font-black uppercase tracking-widest mb-1.5">
          <Battery className="w-3 h-3" />
          Power
        </div>
        <div className={`text-2xl font-black tracking-tighter ${batteryLevel > 20 ? 'text-success' : 'text-destructive'}`}>
          {batteryLevel}%
        </div>
      </div>

      <div className="glass-surface rounded-2xl p-4 shadow-lg border border-white/5 group hover:bg-white/10 transition-colors flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-[7px] font-black uppercase tracking-widest mb-2">
          <Zap className="w-2 h-2" />
          Orientation
        </div>
        <div className="grid grid-cols-3 gap-x-3 w-full max-w-[140px]">
          <div className="flex flex-col items-center">
            <span className="text-[6px] text-muted-foreground/30 font-black uppercase mb-0.5">Roll</span>
            <span className="text-[9px] font-black text-cube-red/90 tabular-nums leading-none">{orientation.x.toFixed(0)}°</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[6px] text-muted-foreground/30 font-black uppercase mb-0.5">Pitch</span>
            <span className="text-[9px] font-black text-cube-green/90 tabular-nums leading-none">{orientation.y.toFixed(0)}°</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[6px] text-muted-foreground/30 font-black uppercase mb-0.5">Yaw</span>
            <span className="text-[9px] font-black text-cube-blue/90 tabular-nums leading-none">{orientation.z.toFixed(0)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CubeStats;
