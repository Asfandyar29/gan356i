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
    <div className="flex flex-wrap items-center justify-center gap-4 bg-white/5 p-4 rounded-3xl backdrop-blur-md border border-white/5 shadow-inner">
      {!isConnected ? (
        <Button
          variant={isConnecting ? 'secondary' : 'default'}
          size="lg"
          onClick={() => onConnect()}
          disabled={isConnecting}
          className="min-w-[200px] h-12 rounded-2xl font-bold tracking-tight shadow-glow hover:shadow-primary/40 transition-all duration-300"
        >
          {isConnecting ? (
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>SEARCHING...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Bluetooth className="w-5 h-5" />
              <span>CONNECT CUBE</span>
            </div>
          )}
        </Button>
      ) : (
        <>
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-success/15 border border-success/30 text-success shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <div className="relative">
              <Zap className="w-4 h-4 fill-success" />
              <div className="absolute -inset-1 bg-success rounded-full blur opacity-20" />
            </div>
            <span className="text-sm font-bold tracking-tight">{deviceName || 'GAN CUBE'}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary" className="h-10 rounded-xl px-5 hover:bg-white/10 transition-colors" onClick={() => onSync()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync
            </Button>

            <Button variant="secondary" className="h-10 rounded-xl px-5 hover:bg-white/10 transition-colors" onClick={onReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>

            <Button variant="default" className="h-10 rounded-xl px-6 font-bold shadow-lg" onClick={onScramble}>
              <Shuffle className="w-4 h-4 mr-2" />
              Scramble
            </Button>

            <Button variant="outline" className="h-10 rounded-xl px-5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors font-bold" onClick={onRescue}>
              <span className="mr-2 text-lg">🚑</span> Rescue
            </Button>

            <Button variant="ghost" className="h-10 rounded-xl px-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => onDisconnect()}>
              Disconnect
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ControlPanel;
