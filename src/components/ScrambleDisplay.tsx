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
    <div className="w-full glass-surface rounded-2xl p-6 shadow-2xl border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-5 text-center">
        {title}
      </div>
      <div className="flex flex-wrap gap-2.5 justify-center items-center">
        {scramble.map((move, index) => {
          let className = "text-xl md:text-2xl font-bold px-3 py-1.5 rounded-xl transition-all duration-300 min-w-[3rem] text-center";

          if (index < currentIndex) {
            className += " text-muted-foreground/20 bg-transparent line-through decoration-muted-foreground/30";
          } else if (index === currentIndex) {
            if (lastMoveCorrect === false) {
              className += " text-destructive bg-destructive/10 ring-1 ring-destructive/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] scale-110 translate-y-[-2px]";
            } else {
              className += " text-primary bg-primary/10 ring-1 ring-primary/40 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-110 translate-y-[-2px]";
            }
          } else {
            className += " text-foreground/70 bg-white/5 border border-white/5";
          }

          return (
            <div key={index} className="relative group">
              <span className={className}>
                {move}
              </span>
              {index === currentIndex && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full blur-[1px] animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center animate-fade-in text-[10px] font-bold uppercase tracking-[0.2em]">
        {currentIndex === scramble.length ? (
          <span className="text-success flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            Ready to Solve
          </span>
        ) : lastMoveCorrect === false ? (
          <span className="text-destructive font-black tracking-wider">Incorrect Input</span>
        ) : (
          <span className="text-muted-foreground/50">Follow the highlighted sequence</span>
        )}
      </div>
    </div>
  );
};

export default ScrambleDisplay;
