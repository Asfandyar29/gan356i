import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RotateCcw, Settings, X, Move3D, Crosshair } from 'lucide-react';
import { CubeOrientation } from '@/types/cube';

const STORAGE_KEY = 'rubiks-axis-config';

export interface AxisConfig {
  xSource: 'x' | 'y' | 'z';
  ySource: 'x' | 'y' | 'z';
  zSource: 'x' | 'y' | 'z';
  xInvert: boolean;
  yInvert: boolean;
  zInvert: boolean;
  gyroEnabled: boolean;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  offsetQuaternion: { x: number; y: number; z: number; w: number } | null;
  quality: 'low' | 'medium' | 'high';
}

// Default config based on user's working settings:
// Pitch (X) = Gyro X, Inverted
// Yaw (Y) = Gyro Z, Normal  
// Roll (Z) = Gyro Y, Inverted
const defaultConfig: AxisConfig = {
  xSource: 'x',
  ySource: 'z',
  zSource: 'y',
  xInvert: true,
  yInvert: false,
  zInvert: true,
  gyroEnabled: true,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  offsetQuaternion: null,
  quality: 'high', // Default for desktop
};

// Simple mobile detection
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const loadAxisConfig = (): AxisConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultConfig, ...parsed };
    }
  } catch {
    // ignore
  }

  // If no saved config and on mobile, default to low quality
  if (isMobile()) {
    return { ...defaultConfig, quality: 'low' };
  }

  return defaultConfig;
};

interface AxisCalibrationProps {
  onConfigChange: (config: AxisConfig) => void;
  currentOrientation: CubeOrientation | null;
  className?: string;
}

const AxisCalibration = ({ onConfigChange, currentOrientation, className }: AxisCalibrationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AxisConfig>(loadAxisConfig);

  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const updateConfig = (updates: Partial<AxisConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfig));
  };

  // ... (rest of helper functions same as before) ...
  const setCurrentAsNeutral = () => {
    if (currentOrientation) {
      const updates: Partial<AxisConfig> = {
        offsetX: -currentOrientation[config.xSource],
        offsetY: -currentOrientation[config.ySource],
        offsetZ: -currentOrientation[config.zSource],
      };

      if (currentOrientation.quaternion) {
        const { x, y, z, w } = currentOrientation.quaternion;
        updates.offsetQuaternion = { x: -x, y: -y, z: -z, w: w };
      }

      updateConfig(updates);
    }
  };

  const swapAxes = (axis1: 'x' | 'y' | 'z', axis2: 'x' | 'y' | 'z') => {
    const sourceKey1 = `${axis1}Source` as keyof AxisConfig;
    const sourceKey2 = `${axis2}Source` as keyof AxisConfig;
    const source1 = config[sourceKey1] as 'x' | 'y' | 'z';
    const source2 = config[sourceKey2] as 'x' | 'y' | 'z';

    updateConfig({
      [sourceKey1]: source2,
      [sourceKey2]: source1,
    });
  };

  const axisLabels: { key: 'x' | 'y' | 'z'; label: string; color: string; description: string }[] = [
    { key: 'x', label: 'Pitch', color: 'text-red-400', description: 'Tilt forward/back' },
    { key: 'y', label: 'Yaw', color: 'text-green-400', description: 'Rotate left/right' },
    { key: 'z', label: 'Roll', color: 'text-blue-400', description: 'Tilt sideways' },
  ];

  const sourceOptions: { value: 'x' | 'y' | 'z'; label: string }[] = [
    { value: 'x', label: 'Gyro X' },
    { value: 'y', label: 'Gyro Y' },
    { value: 'z', label: 'Gyro Z' },
  ];

  // Compact toggle button when closed
  if (!isOpen) {
    return (
      <div className={className || "absolute top-28 md:top-4 left-4 z-10 flex items-center gap-2"}>
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border">
          <Move3D className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Gyro</span>
          <Switch
            checked={config.gyroEnabled}
            onCheckedChange={(checked) => updateConfig({ gyroEnabled: checked })}
            className="scale-75"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    // Fixed modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-background border border-border rounded-xl p-4 shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto relative">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-background pt-2 pb-2 z-10 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Gyro Settings</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Gyro Toggle */}
        <div className="flex items-center justify-between mb-4 p-2 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Move3D className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Enable Gyro Tracking</span>
          </div>
          <Switch
            checked={config.gyroEnabled}
            onCheckedChange={(checked) => updateConfig({ gyroEnabled: checked })}
          />
        </div>

        {/* Quality Settings */}
        <div className="mb-4 space-y-2">
          <label className="text-xs text-muted-foreground">Performance Mode</label>
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <Button
                key={q}
                variant={config.quality === q ? "default" : "ghost"}
                size="sm"
                className="flex-1 h-7 text-[10px] uppercase font-bold rounded-md"
                onClick={() => updateConfig({ quality: q })}
              >
                {q}
              </Button>
            ))}
          </div>
          {config.quality === 'low' && (
            <p className="text-[10px] text-muted-foreground/80 leading-tight">
              Optimized for mobile: reflections and shadows disabled.
            </p>
          )}
        </div>

        {config.gyroEnabled && (
          <>
            {/* Set Current as Neutral */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-4"
              onClick={setCurrentAsNeutral}
            >
              <Crosshair className="w-4 h-4 mr-2" />
              Set Current Position as Neutral
            </Button>

            {/* Current Values Display */}
            {currentOrientation && (
              <div className="mb-4 p-2 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Current Gyro Values (Euler):</div>
                <div className="flex gap-2 text-xs font-mono mb-2">
                  <span className="text-red-400">X: {currentOrientation.x.toFixed(0)}°</span>
                  <span className="text-green-400">Y: {currentOrientation.y.toFixed(0)}°</span>
                  <span className="text-blue-400">Z: {currentOrientation.z.toFixed(0)}°</span>
                </div>
                {currentOrientation.quaternion && (
                  <>
                    <div className="text-xs text-muted-foreground mb-1">Quaternion:</div>
                    <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                      <span className="text-foreground">X: {currentOrientation.quaternion.x.toFixed(3)}</span>
                      <span className="text-foreground">Y: {currentOrientation.quaternion.y.toFixed(3)}</span>
                      <span className="text-foreground">Z: {currentOrientation.quaternion.z.toFixed(3)}</span>
                      <span className="text-foreground">W: {currentOrientation.quaternion.w.toFixed(3)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Axis Mappings */}
            <div className="space-y-3 mb-4">
              <div className="text-xs text-muted-foreground mb-2">Axis Mapping</div>

              {axisLabels.map(({ key, label, color, description }) => {
                const sourceKey = `${key}Source` as keyof AxisConfig;
                const invertKey = `${key}Invert` as keyof AxisConfig;

                return (
                  <div key={key} className="p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className={`text-sm font-medium ${color}`}>{label}</span>
                        <span className="text-xs text-muted-foreground ml-2">({description})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={config[sourceKey] as string}
                        onChange={(e) => updateConfig({ [sourceKey]: e.target.value as 'x' | 'y' | 'z' })}
                        className="flex-1 text-xs bg-background border border-border rounded px-2 py-1.5"
                      >
                        {sourceOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Button
                        variant={config[invertKey] as boolean ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs px-3 min-w-[60px]"
                        onClick={() => updateConfig({ [invertKey]: !(config[invertKey] as boolean) })}
                      >
                        {config[invertKey] as boolean ? 'Inverted' : 'Normal'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Swap Buttons */}
            <div className="mb-4">
              <div className="text-xs text-muted-foreground mb-2">Quick Swap</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => swapAxes('x', 'y')}
                >
                  X ↔ Y
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => swapAxes('y', 'z')}
                >
                  Y ↔ Z
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => swapAxes('x', 'z')}
                >
                  X ↔ Z
                </Button>
              </div>
            </div>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={resetConfig}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset to Default
        </Button>
      </div>
    </div>
  );
};

export default AxisCalibration;