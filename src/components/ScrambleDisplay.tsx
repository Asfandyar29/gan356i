import { useRef, useEffect } from "react";

interface ScrambleDisplayProps {
  scramble: string[];
  currentIndex?: number;
  lastMoveCorrect?: boolean | null;
  title?: string;
}

const getMoveArrow = (move: string) => {
  if (move.endsWith("'")) return "↺";
  return "↻";
};

const ScrambleDisplay = ({ scramble, currentIndex = 0, lastMoveCorrect = null, title = "Solution Scramble" }: ScrambleDisplayProps) => {
  if (scramble.length === 0) {
    return null;
  }

  return (
    <div className="w-full relative py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3 text-center">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center items-center">
        {scramble.map((move, index) => {
          let className = "text-sm md:text-base font-black px-2 py-1 transition-all duration-300 min-w-[2.2rem] text-center rounded-lg";

          if (index < currentIndex) {
            className += " text-white/10 line-through decoration-white/20";
          } else if (index === currentIndex) {
            if (lastMoveCorrect === false) {
              className += " text-destructive bg-destructive/10 ring-1 ring-destructive/30 shadow-[0_0_15px_rgba(239,68,68,0.2)] scale-110";
            } else {
              className += " text-primary bg-primary/20 ring-1 ring-primary/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] scale-110";
            }
          } else {
            className += " text-white/50";
          }

          return (
            <div key={index} className="relative group">
              <span className={className}>
                {move}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-center text-[8px] font-black uppercase tracking-[0.2em]">
        {currentIndex === scramble.length ? (
          <span className="text-success flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            READY
          </span>
        ) : lastMoveCorrect === false ? (
          <span className="text-destructive tracking-widest">INCORRECT MOVE</span>
        ) : (
          <span className="text-white/20">Follow sequence</span>
        )}
      </div>
    </div>
  );
};

export default ScrambleDisplay;
