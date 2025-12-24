import { Battery, Move, Zap } from 'lucide-react';
import { CubeState } from '@/types/cube';

interface CubeStatsProps {
  cubeState: CubeState;
}

const CubeStats = ({ cubeState }: CubeStatsProps) => {
  const { orientation, batteryLevel, moveCount, lastMove } = cubeState;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card-gradient rounded-xl p-4 shadow-card">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <Move className="w-4 h-4" />
          Moves
        </div>
        <div className="text-2xl font-bold text-foreground">
          {moveCount}
        </div>
      </div>

      <div className="card-gradient rounded-xl p-4 shadow-card">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <Zap className="w-4 h-4" />
          Last Move
        </div>
        <div className="text-2xl font-bold font-mono text-primary">
          {lastMove?.notation || '—'}
        </div>
      </div>

      <div className="card-gradient rounded-xl p-4 shadow-card">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <Battery className="w-4 h-4" />
          Battery
        </div>
        <div className={`text-2xl font-bold ${batteryLevel > 20 ? 'text-success' : 'text-destructive'}`}>
          {batteryLevel}%
        </div>
      </div>

      <div className="card-gradient rounded-xl p-4 shadow-card">
        <div className="text-muted-foreground text-sm mb-2">
          Orientation
        </div>
        <div className="flex gap-2 text-sm font-mono">
          <span className="text-cube-red">X:{orientation.x.toFixed(0)}°</span>
          <span className="text-cube-green">Y:{orientation.y.toFixed(0)}°</span>
          <span className="text-cube-blue">Z:{orientation.z.toFixed(0)}°</span>
        </div>
      </div>
    </div>
  );
};

export default CubeStats;
