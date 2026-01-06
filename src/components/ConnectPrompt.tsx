import { useState } from 'react';
import { Bluetooth, Play, HelpCircle, X, Settings, RefreshCw } from 'lucide-react';
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
  showReflections: boolean;
  onToggleReflections: (value: boolean) => void;
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
  showReflections,
  onToggleReflections,
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
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#050505]">
      <div className="max-w-md w-full text-center space-y-10 animate-fade-in">
        {/* Logo/Icon */}
        <div className="relative group">
          <div className="w-28 h-28 mx-auto rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl relative z-10 overflow-hidden transform group-hover:scale-105 transition-transform duration-500">
            <img src="/logo.png" alt="GAN Logo" className="w-16 h-16 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </div>
          <div className="absolute inset-0 w-28 h-28 mx-auto rounded-3xl bg-primary/20 blur-2xl -z-10 animate-pulse" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-white/90">
            GAN Cube <span className="text-primary">Tracker</span>
          </h1>
          <p className="text-muted-foreground/80 text-sm font-medium max-w-[280px] mx-auto leading-relaxed">
            Professional real-time tracking for your GAN smart cube series.
          </p>
        </div>

        {/* Content Section - Minimal Glass Card */}
        <div className="space-y-6 glass-surface p-8 rounded-[2rem] border border-white/5 shadow-2xl">
          {/* MAC Address Section */}
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-2">
                <Settings className="w-3 h-3" />
                Connectivity
              </h3>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="text-muted-foreground/40 hover:text-primary transition-colors"
                title="Help"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {savedMacAddress && !showMacInput ? (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-success/5 border border-success/20 group">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-success/60 font-bold mb-1">Paired Device</span>
                  <code className="text-success font-mono text-sm tracking-wider">{savedMacAddress}</code>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearMac}
                  className="h-8 rounded-lg text-xs font-bold text-success/60 hover:text-success hover:bg-success/10"
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                  placeholder="XX:XX:XX:XX:XX:XX"
                  className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/5 text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-white/10 transition-all font-mono text-sm tracking-widest text-center"
                />
                {macAddress && !isValidMac && (
                  <p className="text-[10px] text-warning/70 font-bold text-center uppercase tracking-wider">Invalid MAC Format</p>
                )}
              </div>
            )}

            {showHelp && (
              <div className="p-4 rounded-2xl bg-black/40 text-left border border-white/5 animate-scale-in">
                <p className="text-[10px] text-primary/80 font-bold uppercase tracking-widest mb-2 text-center">Setup Guide</p>
                <ol className="space-y-2 text-[11px] text-muted-foreground/80 leading-relaxed list-decimal list-inside px-2">
                  <li>Visit <code className="text-white/40">chrome://bluetooth-internals</code></li>
                  <li>Go to <span className="text-white/60">Devices</span> tab</li>
                  <li>Copy the MAC for your <span className="text-white/60">GAN</span> cube</li>
                </ol>
              </div>
            )}
          </div>

          {/* Performance Settings */}
          <div className="space-y-4 text-left p-6 rounded-3xl bg-white/5 border border-white/5 mx-1">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Glass Reflections</h3>
                <p className="text-[9px] text-muted-foreground/30 font-bold uppercase">Advanced 3D Rasterization</p>
              </div>
              <button
                onClick={() => onToggleReflections(!showReflections)}
                className={`
                  w-12 h-6 rounded-full transition-all duration-300 relative shrink-0
                  ${showReflections ? 'bg-primary shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-white/10 border border-white/5'}
                `}
              >
                <div className={`
                  absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 transform
                  ${showReflections ? 'translate-x-[24px]' : 'translate-x-[4px]'}
                `} />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-warning/5 border border-warning/10 flex gap-3">
              <div className="w-1 h-auto bg-warning/30 rounded-full shrink-0" />
              <p className="text-[9px] text-warning/70 font-bold leading-relaxed uppercase tracking-wider">
                <span className="text-warning">NOTE:</span> Enable only on GPU-equipped devices. Disable if you experience frame drops or lag during cube rotation.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-4 pt-4">
            <Button
              variant="default"
              size="lg"
              onClick={handleConnect}
              disabled={isConnecting || (showMacInput && macAddress.length > 0 && !isValidMac)}
              className="w-full h-14 rounded-2xl font-black tracking-widest text-sm shadow-glow hover:shadow-primary/40 transition-all active:scale-[0.98]"
            >
              {isConnecting ? (
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>NEGOTIATING...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Bluetooth className="w-5 h-5" />
                  <span>INITIALIZE LINK</span>
                </div>
              )}
            </Button>

            <Button
              variant="ghost"
              size="lg"
              onClick={() => onDemoMode()}
              className="w-full h-12 rounded-2xl text-muted-foreground/60 hover:text-white hover:bg-white/5 font-bold tracking-widest text-[10px]"
            >
              <Play className="w-3 h-3 mr-2 opacity-50" />
              LAUNCH SIMULATOR
            </Button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="space-y-6 pt-4">
          {error && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-bold uppercase tracking-wider animate-shake">
              {error}
            </div>
          )}

          <div className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-[0.3em] flex flex-col items-center gap-2">
            <span>Enterprise Engine V3.0</span>
            <div className="w-12 h-0.5 bg-white/5 rounded-full" />
            <span className="max-w-[180px] leading-relaxed">
              CHROME • EDGE • OPERA • BLUE BLUETOOTH
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectPrompt;