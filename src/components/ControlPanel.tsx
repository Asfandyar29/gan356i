import { Button } from '@/components/ui/button';
import { Bluetooth, RefreshCw, Shuffle, RotateCcw, Zap } from 'lucide-react';
import { ConnectionState } from '@/types/cube';

interface ControlPanelProps {
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  onReset: () => void;
  onScramble: () => void;
  deviceName: string | null;
}

const ControlPanel = ({
  connectionState,
  onConnect,
  onDisconnect,
  onSync,
  onReset,
  onScramble,
  deviceName,
}: ControlPanelProps) => {
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {!isConnected ? (
        <Button
          variant={isConnecting ? 'secondary' : 'hero'}
          size="lg"
          onClick={onConnect}
          disabled={isConnecting}
          className="min-w-[180px]"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin">
                <Bluetooth className="w-5 h-5" />
              </div>
              Connecting...
            </>
          ) : (
            <>
              <Bluetooth className="w-5 h-5" />
              Connect Cube
            </>
          )}
        </Button>
      ) : (
        <>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 border border-success/30 text-success">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">{deviceName || 'Connected'}</span>
          </div>
          
          <Button variant="glass" size="default" onClick={onSync}>
            <RefreshCw className="w-4 h-4" />
            Sync
          </Button>

          <Button variant="glass" size="default" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>

          <Button variant="default" size="default" onClick={onScramble}>
            <Shuffle className="w-4 h-4" />
            Scramble
          </Button>

          <Button variant="outline" size="default" onClick={onDisconnect}>
            Disconnect
          </Button>
        </>
      )}
    </div>
  );
};

export default ControlPanel;
