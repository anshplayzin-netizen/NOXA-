import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Volume2, Zap, Music } from 'lucide-react';

interface SettingsPanelProps {
  speed: number;
  pitch: number;
  volume: number;
  onSpeedChange: (val: number) => void;
  onPitchChange: (val: number) => void;
  onVolumeChange: (val: number) => void;
  theme?: 'dark' | 'light';
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  speed,
  pitch,
  volume,
  onSpeedChange,
  onPitchChange,
  onVolumeChange,
  theme = 'dark',
}) => {
  const accentColor = theme === 'dark' ? 'text-white' : 'text-indigo-600';
  const labelColor = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const bgColor = theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200';

  return (
    <div className={`space-y-6 p-4 ${bgColor} rounded-xl border shadow-sm`}>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className={`flex items-center gap-2 ${labelColor}`}>
            <Zap size={14} /> Speed
          </Label>
          <span className={`text-xs font-mono ${accentColor}`}>{speed.toFixed(1)}x</span>
        </div>
        <Slider
          value={[speed]}
          min={0.5}
          max={2}
          step={0.1}
          onValueChange={(val) => onSpeedChange(Array.isArray(val) ? val[0] : val)}
          className="py-2"
        />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className={`flex items-center gap-2 ${labelColor}`}>
            <Music size={14} /> Pitch
          </Label>
          <span className={`text-xs font-mono ${accentColor}`}>{pitch.toFixed(1)}</span>
        </div>
        <Slider
          value={[pitch]}
          min={0.5}
          max={2}
          step={0.1}
          onValueChange={(val) => onPitchChange(Array.isArray(val) ? val[0] : val)}
          className="py-2"
        />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className={`flex items-center gap-2 ${labelColor}`}>
            <Volume2 size={14} /> Volume
          </Label>
          <span className={`text-xs font-mono ${accentColor}`}>{(volume * 100).toFixed(0)}%</span>
        </div>
        <Slider
          value={[volume]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(val) => onVolumeChange(Array.isArray(val) ? val[0] : val)}
          className="py-2"
        />
      </div>
    </div>
  );
};
