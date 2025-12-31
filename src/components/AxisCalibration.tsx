import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Settings, X } from 'lucide-react';

export interface AxisConfig {
  xSource: 'x' | 'y' | 'z';
  ySource: 'x' | 'y' | 'z';
  zSource: 'x' | 'y' | 'z';
  xInvert: boolean;
  yInvert: boolean;
  zInvert: boolean;
}

const defaultConfig: AxisConfig = {
  xSource: 'y',
  ySource: 'z',
  zSource: 'x',
  xInvert: false,
  yInvert: false,
  zInvert: true,
};

const STORAGE_KEY = 'cube-axis-config';

interface AxisCalibrationProps {
  onConfigChange: (config: AxisConfig) => void;
}

export const loadAxisConfig = (): AxisConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return defaultConfig;
};

const AxisCalibration = ({ onConfigChange }: AxisCalibrationProps) => {
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

  const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90"
      >
        <Settings className="w-4 h-4 mr-1" />
        Axis
      </Button>
    );
  }

  return (
    <div className="absolute top-2 right-2 z-10 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Axis Calibration</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* X Axis */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono w-6 text-red-500">X:</span>
          <select
            value={config.xSource}
            onChange={(e) => updateConfig({ xSource: e.target.value as 'x' | 'y' | 'z' })}
            className="flex-1 text-xs bg-muted border border-border rounded px-2 py-1"
          >
            {axes.map((a) => (
              <option key={a} value={a}>{a.toUpperCase()}</option>
            ))}
          </select>
          <Button
            variant={config.xInvert ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => updateConfig({ xInvert: !config.xInvert })}
          >
            {config.xInvert ? '-' : '+'}
          </Button>
        </div>

        {/* Y Axis */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono w-6 text-green-500">Y:</span>
          <select
            value={config.ySource}
            onChange={(e) => updateConfig({ ySource: e.target.value as 'x' | 'y' | 'z' })}
            className="flex-1 text-xs bg-muted border border-border rounded px-2 py-1"
          >
            {axes.map((a) => (
              <option key={a} value={a}>{a.toUpperCase()}</option>
            ))}
          </select>
          <Button
            variant={config.yInvert ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => updateConfig({ yInvert: !config.yInvert })}
          >
            {config.yInvert ? '-' : '+'}
          </Button>
        </div>

        {/* Z Axis */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono w-6 text-blue-500">Z:</span>
          <select
            value={config.zSource}
            onChange={(e) => updateConfig({ zSource: e.target.value as 'x' | 'y' | 'z' })}
            className="flex-1 text-xs bg-muted border border-border rounded px-2 py-1"
          >
            {axes.map((a) => (
              <option key={a} value={a}>{a.toUpperCase()}</option>
            ))}
          </select>
          <Button
            variant={config.zInvert ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => updateConfig({ zInvert: !config.zInvert })}
          >
            {config.zInvert ? '-' : '+'}
          </Button>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-3 text-xs"
        onClick={resetConfig}
      >
        <RotateCcw className="w-3 h-3 mr-1" />
        Reset to Default
      </Button>
    </div>
  );
};

export default AxisCalibration;
