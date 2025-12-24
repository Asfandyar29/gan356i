interface TimerDisplayProps {
  time: string;
  isRunning: boolean;
}

const TimerDisplay = ({ time, isRunning }: TimerDisplayProps) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className={`
          font-mono text-6xl md:text-8xl font-bold tracking-tight
          transition-all duration-300
          ${isRunning 
            ? 'text-primary animate-pulse' 
            : 'text-foreground'
          }
        `}
      >
        {time}
      </div>
      <div className="text-sm text-muted-foreground uppercase tracking-widest">
        {isRunning ? 'Solving...' : 'Timer'}
      </div>
    </div>
  );
};

export default TimerDisplay;
