export interface Voice {
  id: string;
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'neutral';
  provider: 'browser' | 'gemini';
  description?: string;
}

export interface HistoryItem {
  id: string;
  text: string;
  voiceId: string;
  settings: {
    speed: number;
    pitch: number;
    volume: number;
  };
  timestamp: number;
  audioUrl?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  favoriteVoices: string[];
}
