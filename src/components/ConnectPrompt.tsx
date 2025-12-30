import { Bluetooth, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectPromptProps {
  onConnect: () => void;
  onDemoMode: () => void;
  isConnecting: boolean;
  error: string | null;
}

const ConnectPrompt = ({ onConnect, onDemoMode, isConnecting, error }: ConnectPromptProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
        {/* Logo/Icon */}
        <div className="relative">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
            <Bluetooth className="w-12 h-12 text-primary-foreground" />
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-2xl bg-primary/30 blur-xl -z-10" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            GAN Cube Tracker
          </h1>
          <p className="text-muted-foreground">
            Connect your GAN smart cube to track moves, orientation, and time your solves.
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            variant="hero"
            size="xl"
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full"
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

          <Button
            variant="glass"
            size="lg"
            onClick={onDemoMode}
            className="w-full"
          >
            <Play className="w-4 h-4" />
            Try Demo Mode
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="space-y-3 text-left p-4 rounded-xl bg-card/50 border border-border/50">
          <h3 className="font-medium text-foreground">Supported Cubes:</h3>
          <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
            <li>GAN356 i3, i Carry, i Carry S, i Carry 2</li>
            <li>GAN12 ui, GAN12 ui FreePlay, GAN12 ui Maglev</li>
            <li>GAN14 ui FreePlay, GAN Mini ui FreePlay</li>
            <li>Monster Go 3Ai, MoYu AI 2023</li>
          </ul>
        </div>

        {/* Quick Start */}
        <div className="space-y-3 text-left p-4 rounded-xl bg-card/50 border border-border/50">
          <h3 className="font-medium text-foreground">Quick Start:</h3>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Wake up your GAN cube by making a few moves</li>
            <li>Click "Connect Cube" and select your cube from the list</li>
            <li>Start solving!</li>
          </ol>
        </div>

        {/* Browser Support Note */}
        <p className="text-xs text-muted-foreground">
          Requires Chrome, Edge, or Opera with Web Bluetooth support
        </p>
      </div>
    </div>
  );
};

export default ConnectPrompt;
