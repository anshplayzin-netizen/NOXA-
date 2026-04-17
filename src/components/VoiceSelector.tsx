import React from 'react';
import { Voice, LANGUAGES } from '@/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  selectedLang: string;
  onLangChange: (lang: string) => void;
  favoriteVoices: string[];
  onToggleFavorite: (voiceId: string) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoiceId,
  onVoiceChange,
  selectedLang,
  onLangChange,
  favoriteVoices,
  onToggleFavorite,
}) => {
  const filteredVoices = voices.filter(v => v.lang.startsWith(selectedLang.split('-')[0]));
  
  // Sort voices: favorites first
  const sortedVoices = [...filteredVoices].sort((a, b) => {
    const aFav = favoriteVoices.includes(a.id);
    const bFav = favoriteVoices.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500 uppercase tracking-wider">Language</Label>
          <Select value={selectedLang} onValueChange={onLangChange}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-zinc-500 uppercase tracking-wider">Voice</Label>
            {selectedVoiceId && (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(selectedVoiceId);
                }}
                className={`transition-colors ${favoriteVoices.includes(selectedVoiceId) ? 'text-yellow-500' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                <Star size={14} fill={favoriteVoices.includes(selectedVoiceId) ? "currentColor" : "none"} />
              </button>
            )}
          </div>
          <Select value={selectedVoiceId} onValueChange={onVoiceChange}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Select Voice" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              {sortedVoices.map(voice => (
                <SelectItem key={voice.id} value={voice.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-2">
                      <span>{voice.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0 h-4 border-zinc-700">
                        {voice.provider}
                      </Badge>
                    </div>
                    {favoriteVoices.includes(voice.id) && (
                      <Star size={10} className="text-yellow-500" fill="currentColor" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
