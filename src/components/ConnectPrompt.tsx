import { useState } from 'react';
import { Bluetooth, Play, HelpCircle, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectPromptProps {
  onConnect: (mac?: string) => void;
  onDemoMode: () => void;
  isConnecting: boolean;
  error: string | null;
  savedMacAddress: string | null;
  needsMacAddress: boolean;
  pendingDeviceName: string | null;
  onConfirmMacAddress: (mac: string) => void;
  onCancelConnection: () => void;
  onClearMacAddress: () => void;
}

const ConnectPrompt = ({ 
  onConnect, 
  onDemoMode, 
  isConnecting, 
  error, 
  savedMacAddress,
  needsMacAddress,
  pendingDeviceName,
  onConfirmMacAddress,
  onCancelConnection,
  onClearMacAddress,
}: ConnectPromptProps) => {
  const [macAddress, setMacAddress] = useState(savedMacAddress || '');
  const [showHelp, setShowHelp] = useState(false);
  const [showMacInput, setShowMacInput] = useState(!savedMacAddress);

  const isValidMac = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(macAddress);

  const handleConfirmMac = () => {
    if (isValidMac) {
      onConfirmMacAddress(macAddress);
    }
  };

  const handleConnect = () => {
    if (showMacInput && isValidMac) {
      onConnect(macAddress);
    } else if (savedMacAddress) {
      onConnect(savedMacAddress);
    } else {
      // No MAC address, will prompt after device selection
      onConnect();
    }
  };

  const handleClearMac = () => {
    setMacAddress('');
    setShowMacInput(true);
    onClearMacAddress();
  };

  // Show MAC address input modal if needed (during connection)
  if (needsMacAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-warning to-warning/70 flex items-center justify-center">
              <Bluetooth className="w-10 h-10 text-warning-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              MAC Address Required
            </h2>
            <p className="text-muted-foreground text-sm">
              Connected to <span className="font-medium text-foreground">{pendingDeviceName}</span>, but need MAC address for encryption.
            </p>
          </div>

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
              autoFocus
            />
            {macAddress && !isValidMac && (
              <p className="text-xs text-warning">Enter a valid MAC address (e.g., A1:B2:C3:D4:E5:F6)</p>
            )}
          </div>

          {showHelp && (
            <div className="p-4 rounded-xl bg-card border border-border text-left space-y-3 animate-scale-in">
              <h4 className="font-medium text-foreground">How to find your MAC address:</h4>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Open Chrome and go to <code className="bg-muted px-1 rounded text-xs">chrome://bluetooth-internals</code></li>
                <li>Click on the "Devices" tab</li>
                <li>Find your cube (starts with "GAN") in the list</li>
                <li>Copy the MAC address (format: XX:XX:XX:XX:XX:XX)</li>
              </ol>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={onCancelConnection}
              className="flex-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              variant="hero"
              size="lg"
              onClick={handleConfirmMac}
              disabled={!isValidMac}
              className="flex-1"
            >
              Connect
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

        {/* MAC Address Section */}
        <div className="space-y-3 text-left p-4 rounded-xl bg-card/50 border border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4" />
              MAC Address
            </h3>
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {savedMacAddress && !showMacInput ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/30">
              <code className="text-success font-mono text-sm">{savedMacAddress}</code>
              <button 
                onClick={handleClearMac}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                placeholder="XX:XX:XX:XX:XX:XX"
                className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
              />
              {macAddress && !isValidMac && (
                <p className="text-xs text-warning">Enter a valid MAC address (e.g., A1:B2:C3:D4:E5:F6)</p>
              )}
            </div>
          )}

          {showHelp && (
            <div className="p-3 rounded-lg bg-muted/50 text-left space-y-2 animate-scale-in">
              <p className="text-xs text-muted-foreground font-medium">How to find your MAC address:</p>
              <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
                <li>Open Chrome: <code className="bg-muted px-1 rounded">chrome://bluetooth-internals</code></li>
                <li>Click "Devices" tab</li>
                <li>Find your cube (starts with "GAN")</li>
                <li>Copy the MAC address</li>
              </ol>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            variant="hero"
            size="xl"
            onClick={handleConnect}
            disabled={isConnecting || (showMacInput && macAddress.length > 0 && !isValidMac)}
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
            onClick={() => onDemoMode()}
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

        {/* Browser Support Note */}
        <p className="text-xs text-muted-foreground">
          Requires Chrome, Edge, or Opera with Web Bluetooth support
        </p>
      </div>
    </div>
  );
};

export default ConnectPrompt;