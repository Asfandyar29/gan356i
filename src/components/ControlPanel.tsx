import { Button } from '@/components/ui/button';
import { Bluetooth, RefreshCw, Shuffle, RotateCcw, Zap } from 'lucide-react';
import { ConnectionState } from '@/types/cube';

interface ControlPanelProps {
  connectionState: ConnectionState;
  onConnect: () => void | Promise<void>;
  onDisconnect: () => void | Promise<void>;
  onSync: () => void | Promise<void>;
  onReset: () => void;
  onScramble: () => void;
  onRescue: () => void;
  deviceName: string | null;
}

const ControlPanel = ({
  connectionState,
  onConnect,
  onDisconnect,
  onSync,
  onReset,
  onScramble,
  onRescue,
  deviceName,
}: ControlPanelProps) => {
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  return (
    <div className="w-full flex flex-nowrap md:flex-wrap items-center md:justify-center gap-2 md:gap-4 md:bg-white/5 md:p-4 md:rounded-3xl md:backdrop-blur-md md:border md:border-white/5 md:shadow-inner overflow-x-auto md:overflow-visible pb-1 md:pb-0 scrollbar-none snap-x p-1">
      {!isConnected ? (
        <Button
          variant={isConnecting ? 'secondary' : 'default'}
          size="lg"
          onClick={() => onConnect()}
          disabled={isConnecting}
          className="w-full md:min-w-[200px] h-10 md:h-12 rounded-xl md:rounded-2xl font-bold tracking-tight shadow-glow hover:shadow-primary/40 transition-all duration-300 flex-shrink-0"
        >
          {isConnecting ? (
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              <span className="text-sm md:text-base">SEARCHING...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Bluetooth className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">CONNECT CUBE</span>
            </div>
          )}
        </Button>
      ) : (
        <>
          <div className="flex items-center gap-2 px-3 py-2 md:gap-2.5 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl bg-success/15 border border-success/30 text-success shadow-[0_0_15px_rgba(34,197,94,0.1)] flex-shrink-0 snap-start">
            <div className="relative">
              <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 fill-success" />
              <div className="absolute -inset-1 bg-success rounded-full blur opacity-20" />
            </div>
            <span className="text-xs md:text-sm font-bold tracking-tight whitespace-nowrap">{deviceName || 'GAN CUBE'}</span>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-nowrap md:flex-wrap">
            <Button variant="secondary" className="h-9 md:h-10 rounded-lg md:rounded-xl px-3 md:px-5 hover:bg-white/10 transition-colors flex-shrink-0 snap-start" onClick={() => onSync()}>
              <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              <span className="text-xs md:text-sm">Sync</span>
            </Button>

            <Button variant="secondary" className="h-9 md:h-10 rounded-lg md:rounded-xl px-3 md:px-5 hover:bg-white/10 transition-colors flex-shrink-0 snap-start" onClick={onReset}>
              <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              <span className="text-xs md:text-sm">Reset</span>
            </Button>

            <Button variant="default" className="h-9 md:h-10 rounded-lg md:rounded-xl px-4 md:px-6 font-bold shadow-lg flex-shrink-0 snap-start" onClick={onScramble}>
              <Shuffle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              <span className="text-xs md:text-sm">Scramble</span>
            </Button>

            <Button variant="outline" className="h-9 md:h-10 rounded-lg md:rounded-xl px-3 md:px-5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors font-bold flex-shrink-0 snap-start" onClick={onRescue}>
              <span className="mr-1.5 md:mr-2 text-base md:text-lg">🚑</span>
              <span className="text-xs md:text-sm">Rescue</span>
            </Button>

            <Button variant="ghost" className="h-9 md:h-10 rounded-lg md:rounded-xl px-3 md:px-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 snap-start" onClick={() => onDisconnect()}>
              <span className="text-xs md:text-sm">Disconnect</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ControlPanel;
