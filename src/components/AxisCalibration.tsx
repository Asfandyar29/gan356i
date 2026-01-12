import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  quality: 'high',
};

const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const loadAxisConfig = (): AxisConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultConfig, ...JSON.parse(saved) };
    }
  } catch { } // eslint-disable-line no-empty
  if (isMobile()) return { ...defaultConfig, quality: 'low' };
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
    const s1 = (config as any)[`${axis1}Source`];
    const s2 = (config as any)[`${axis2}Source`];
    updateConfig({
      [`${axis1}Source`]: s2,
      [`${axis2}Source`]: s1,
    } as any);
  };

  const axisLabels: { key: 'x' | 'y' | 'z'; label: string; color: string; description: string }[] = [
    { key: 'x', label: 'Pitch', color: 'text-red-400', description: 'Tilt forward/back' },
    { key: 'y', label: 'Yaw', color: 'text-green-400', description: 'Rotate left/right' },
    { key: 'z', label: 'Roll', color: 'text-blue-400', description: 'Tilt sideways' },
  ];

  const sourceOptions = [
    { value: 'x', label: 'Gyro X' },
    { value: 'y', label: 'Gyro Y' },
    { value: 'z', label: 'Gyro Z' },
  ];

  // Trigger Button Structure
  const triggerButton = (
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

  // Modal Content via Portal
  const modalContent = isOpen ? createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 text-left">
      {/* Backdrop with Blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal Card */}
      <div className="relative z-10 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden text-zinc-100 animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-zinc-100">Gyro Settings</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800 text-zinc-400" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-3 space-y-4 bg-zinc-950">

          {/* Main Toggles */}
          <div className="space-y-3">
            {/* Enable Gyro */}
            <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <Move3D className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-200">Tracking</span>
                  <span className="text-[10px] text-zinc-500">Enable gyro feedback</span>
                </div>
              </div>
              <Switch
                checked={config.gyroEnabled}
                onCheckedChange={(checked) => updateConfig({ gyroEnabled: checked })}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            {/* Performance Mode */}
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Performance</span>
                <span className="text-[10px] text-zinc-500">{config.quality}</span>
              </div>
              <div className="flex bg-zinc-950 rounded-md p-1 border border-zinc-800">
                {(['low', 'medium', 'high'] as const).map((q) => (
                  <button
                    key={q}
                    className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded transition-all ${config.quality === q ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    onClick={() => updateConfig({ quality: q })}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {config.gyroEnabled && (
            <>
              {/* Calibration */}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs font-medium bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                onClick={setCurrentAsNeutral}
              >
                <Crosshair className="w-3.5 h-3.5 mr-2" />
                Set Current Position as Neutral
              </Button>

              {/* Current Values (Compact) */}
              {currentOrientation && (
                <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 p-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-red-400 font-semibold">X: {currentOrientation.x.toFixed(0)}°</span>
                    <span className="text-green-400 font-semibold">Y: {currentOrientation.y.toFixed(0)}°</span>
                    <span className="text-blue-400 font-semibold">Z: {currentOrientation.z.toFixed(0)}°</span>
                  </div>
                </div>
              )}

              {/* Axis Mapping */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 px-1">Axis Mapping</div>
                <div className="grid gap-2">
                  {axisLabels.map(({ key, label, color, description }) => {
                    const sourceKey = `${key}Source` as keyof AxisConfig;
                    const invertKey = `${key}Invert` as keyof AxisConfig;

                    return (
                      <div key={key} className="flex items-center gap-2 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <div className="w-10 text-xs font-bold shrink-0 text-zinc-300">{label}</div>

                        <select
                          value={config[sourceKey] as string}
                          onChange={(e) => updateConfig({ [sourceKey]: e.target.value as 'x' | 'y' | 'z' })}
                          className="flex-1 h-7 text-xs bg-zinc-950 border border-zinc-800 rounded px-2 text-zinc-300 focus:ring-1 focus:ring-primary focus:outline-none"
                        >
                          {sourceOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label.replace('Gyro ', '')} Axis</option>
                          ))}
                        </select>

                        <Button
                          variant={config[invertKey] as boolean ? "default" : "secondary"}
                          size="sm"
                          className={`h-7 px-2 text-[10px] font-bold min-w-[3rem] ${config[invertKey] ? '' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                          onClick={() => updateConfig({ [invertKey]: !(config[invertKey] as boolean) })}
                        >
                          {config[invertKey] as boolean ? 'INV' : 'NOR'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Swap */}
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[10px] bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white" onClick={() => swapAxes('x', 'y')}>X ↔ Y</Button>
                <Button variant="outline" size="sm" className="h-7 text-[10px] bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white" onClick={() => swapAxes('y', 'z')}>Y ↔ Z</Button>
                <Button variant="outline" size="sm" className="h-7 text-[10px] bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white" onClick={() => swapAxes('x', 'z')}>X ↔ Z</Button>
              </div>
            </>
          )}

          {/* Close Button (Bottom Mobile access) */}
          <Button
            variant="ghost"
            className="w-full text-zinc-500 hover:text-white md:hidden"
            onClick={() => setIsOpen(false)}
          >
            Close Settings
          </Button>

          {/* Reset */}
          <div className="flex justify-center pt-2">
            <button
              className="text-[10px] text-zinc-600 hover:text-red-400 flex items-center gap-1 transition-colors"
              onClick={resetConfig}
            >
              <RotateCcw className="w-3 h-3" />
              Reset Defaults
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {triggerButton}
      {modalContent}
    </>
  );
};

export default AxisCalibration;