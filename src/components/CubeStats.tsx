import { Battery, Move, Zap } from 'lucide-react';
import { CubeState } from '@/types/cube';

interface CubeStatsProps {
  cubeState: CubeState;
}

const CubeStats = ({ cubeState }: CubeStatsProps) => {
  const { orientation, batteryLevel, moveCount, lastMove } = cubeState;

  return (
    <div className="grid grid-cols-4 md:grid-cols-2 gap-2 md:gap-3 w-full">
      <div className="glass-surface rounded-xl md:rounded-2xl p-2 md:p-4 shadow-lg border border-white/5 group hover:bg-white/10 transition-colors flex flex-col justify-center min-h-[60px] md:min-h-0">
        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-0.5 md:mb-1.5">
          <Move className="w-2.5 h-2.5 md:w-3 md:h-3" />
          <span className="hidden md:inline">Analytics</span>
          <span className="md:hidden">Moves</span>
        </div>
        <div className="text-xl md:text-2xl font-black text-foreground/90 tracking-tighter leading-none">
          {moveCount}
        </div>
      </div>

      <div className="glass-surface rounded-xl md:rounded-2xl p-2 md:p-4 shadow-lg border border-white/5 group hover:bg-white/10 transition-colors flex flex-col justify-center min-h-[60px] md:min-h-0">
        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-0.5 md:mb-1.5">
          <Zap className="w-2.5 h-2.5 md:w-3 md:h-3" />
          <span className="hidden md:inline">Sequence</span>
          <span className="md:hidden">Last</span>
        </div>
        <div className="text-xl md:text-2xl font-black text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] tracking-tighter leading-none">
          {lastMove?.notation || '—'}
        </div>
      </div>

      <div className="glass-surface rounded-xl md:rounded-2xl p-2 md:p-4 shadow-lg border border-white/5 group hover:bg-white/10 transition-colors flex flex-col justify-center min-h-[60px] md:min-h-0">
        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-0.5 md:mb-1.5">
          <Battery className="w-2.5 h-2.5 md:w-3 md:h-3" />
          <span className="hidden md:inline">Power</span>
          <span className="md:hidden">Bat</span>
        </div>
        <div className={`text-xl md:text-2xl font-black tracking-tighter leading-none ${batteryLevel > 20 ? 'text-success' : 'text-destructive'}`}>
          {batteryLevel}%
        </div>
      </div>

      <div className="glass-surface rounded-xl md:rounded-2xl p-2 md:p-4 shadow-lg border border-white/5 group hover:bg-white/10 transition-colors flex flex-col items-center justify-center text-center min-h-[60px] md:min-h-0">
        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-[7px] font-black uppercase tracking-widest mb-1 md:mb-2 w-full justify-center">
          <Zap className="w-2 h-2 hidden md:block" />
          <span>Angle</span>
        </div>
        <div className="flex flex-col md:grid md:grid-cols-3 gap-0.5 md:gap-x-3 w-full">
          <div className="flex justify-between md:flex-col items-center w-full px-1 md:px-0">
            <span className="text-[6px] text-muted-foreground/30 font-black uppercase mr-1 md:mr-0 md:mb-0.5">X</span>
            <span className="text-[8px] md:text-[9px] font-black text-cube-red/90 tabular-nums leading-none">{orientation.x.toFixed(0)}°</span>
          </div>
          <div className="flex justify-between md:flex-col items-center w-full px-1 md:px-0 hidden md:flex">
            <span className="text-[6px] text-muted-foreground/30 font-black uppercase mr-1 md:mr-0 md:mb-0.5">Y</span>
            <span className="text-[8px] md:text-[9px] font-black text-cube-green/90 tabular-nums leading-none">{orientation.y.toFixed(0)}°</span>
          </div>
          {/* On mobile only show X/Y/Z stacked or just X/Y? 
              Let's show all 3 in a flex row? 
              Actually flex-col space is tight.
              Let's do a flex row with tiny text.
          */}
        </div>
        {/* Mobile Orientation Replacement: Row of 3 values */}
        <div className="flex md:hidden justify-between w-full px-1 gap-1">
          <span className="text-[8px] font-black text-cube-red/90">{orientation.x.toFixed(0)}°</span>
          <span className="text-[8px] font-black text-cube-green/90">{orientation.y.toFixed(0)}°</span>
          <span className="text-[8px] font-black text-cube-blue/90">{orientation.z.toFixed(0)}°</span>
        </div>
      </div>
    </div>
  );
};

export default CubeStats;
