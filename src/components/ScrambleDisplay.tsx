interface ScrambleDisplayProps {
  scramble: string[];
  currentMove?: number;
}

const ScrambleDisplay = ({ scramble, currentMove }: ScrambleDisplayProps) => {
  if (scramble.length === 0) {
    return null;
  }

  return (
    <div className="card-gradient rounded-xl p-6 shadow-card">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Scramble
      </h3>
      <div className="flex flex-wrap gap-2">
        {scramble.map((move, index) => (
          <span
            key={index}
            className={`
              px-3 py-1.5 rounded-lg font-mono text-base font-medium
              transition-all duration-200
              ${currentMove !== undefined && index < currentMove
                ? 'bg-success/20 text-success'
                : currentMove !== undefined && index === currentMove
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-secondary text-secondary-foreground'
              }
            `}
          >
            {move}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ScrambleDisplay;
