interface TimerDisplayProps {
  time: string;
  isRunning: boolean;
}

const TimerDisplay = ({ time, isRunning }: TimerDisplayProps) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`
          timer-display text-7xl md:text-9xl font-extrabold tracking-tighter
          transition-all duration-500 transform
          ${isRunning
            ? 'text-primary scale-105 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]'
            : 'text-foreground/90'
          }
        `}
      >
        {time}
      </div>
      <div className={`
        text-xs font-bold uppercase tracking-[0.3em] transition-colors duration-300
        ${isRunning ? 'text-primary animate-pulse' : 'text-muted-foreground/60'}
      `}>
        {isRunning ? 'Current Solve' : 'Last Result'}
      </div>
    </div>
  );
};

export default TimerDisplay;
