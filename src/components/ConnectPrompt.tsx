import { useState } from 'react';
import { Bluetooth, Play, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectPromptProps {
  onConnect: (macAddress: string) => void;
  onDemoMode: () => void;
  isConnecting: boolean;
  error: string | null;
  savedMacAddress: string | null;
}

const ConnectPrompt = ({ onConnect, onDemoMode, isConnecting, error, savedMacAddress }: ConnectPromptProps) => {
  const [macAddress, setMacAddress] = useState(savedMacAddress || '');
  const [showHelp, setShowHelp] = useState(false);

  const handleConnect = () => {
    onConnect(macAddress);
  };

  const isValidMac = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(macAddress);

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
            Connect your GAN 356i smart cube to track moves, orientation, and time your solves.
          </p>
        </div>

        {/* MAC Address Input */}
        <div className="space-y-2 text-left">
          <div className="flex items-center justify-between">
            <label htmlFor="macAddress" className="text-sm font-medium text-foreground">
              Cube MAC Address
            </label>
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <input
            id="macAddress"
            type="text"
            value={macAddress}
            onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
            placeholder="XX:XX:XX:XX:XX:XX"
            className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
          />
          {macAddress && !isValidMac && (
            <p className="text-xs text-warning">Enter a valid MAC address (e.g., A1:B2:C3:D4:E5:F6)</p>
          )}
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="p-4 rounded-xl bg-card border border-border text-left space-y-3 animate-scale-in">
            <h4 className="font-medium text-foreground">How to find your MAC address:</h4>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Open Chrome and go to <code className="bg-muted px-1 rounded text-xs">chrome://bluetooth-internals</code></li>
              <li>Click on the "Devices" tab</li>
              <li>Wake up your GAN cube and pair it via Bluetooth settings</li>
              <li>Find your cube (starts with "GAN") in the list</li>
              <li>Copy the MAC address (format: XX:XX:XX:XX:XX:XX)</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              The MAC address is required for proper data decryption from the cube.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            variant="hero"
            size="xl"
            onClick={handleConnect}
            disabled={isConnecting || !isValidMac}
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
          <h3 className="font-medium text-foreground">Quick Start:</h3>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Enter your cube's MAC address above</li>
            <li>Wake up your GAN cube by making a few moves</li>
            <li>Click Connect and select your cube from the list</li>
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
