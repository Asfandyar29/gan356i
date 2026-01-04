import { useRef, useEffect } from "react";

interface ScrambleDisplayProps {
  scramble: string[];
  currentIndex?: number;
  lastMoveCorrect?: boolean | null;
}

const getMoveArrow = (move: string) => {
  if (move.endsWith("'")) return "↺";
  return "↻";
};

const ScrambleDisplay = ({ scramble, currentIndex = 0, lastMoveCorrect = null }: ScrambleDisplayProps) => {
  if (scramble.length === 0) {
    return null;
  }

  return (
    <div className="w-full card-gradient rounded-xl p-6 shadow-card border border-border/50">
      <div className="text-sm uppercase tracking-wider text-muted-foreground mb-4 text-center">
        Scramble Sequence
      </div>
      <div className="flex flex-wrap gap-3 justify-center items-center">
        {scramble.map((move, index) => {
          let className = "text-xl md:text-2xl font-mono font-bold px-3 py-1.5 rounded transition-all duration-300";

          if (index < currentIndex) {
            // Completed moves
            className += " text-muted-foreground/40 bg-muted/10";
          } else if (index === currentIndex) {
            // Current move
            if (lastMoveCorrect === false) {
              // Error state
              className += " text-destructive bg-destructive/20 ring-2 ring-destructive shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-110";
            } else {
              // Active state
              className += " text-primary bg-primary/20 ring-2 ring-primary shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110";
            }
          } else {
            // Future moves
            className += " text-foreground/80 bg-muted/30 border border-border/30";
          }

          return (
            <span key={index} className={className}>
              {move}
              {index === currentIndex && (
                <span className="ml-1 inline-block text-xs opacity-70">
                  {getMoveArrow(move)}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {currentIndex === scramble.length ? (
        <div className="mt-4 text-center text-success animate-fade-in font-medium">
          Scramble Complete! Proceed to Inspection.
        </div>
      ) : lastMoveCorrect === false ? (
        <div className="mt-4 text-center text-destructive animate-fade-in font-bold">
          Incorrect Move! Undo and try again.
        </div>
      ) : (
        <div className="mt-4 text-center text-muted-foreground animate-fade-in text-sm opacity-0 md:opacity-100">
          Follow the highlighted move
        </div>
      )}
    </div>
  );
};

export default ScrambleDisplay;
