export type { Voice } from './types';
import { Voice } from './types';

export const BROWSER_VOICES_FALLBACK: Voice[] = [
  { id: 'en-US-standard', name: 'English (US) Standard', lang: 'en-US', gender: 'neutral', provider: 'browser' },
  { id: 'hi-IN-standard', name: 'Hindi (India) Standard', lang: 'hi-IN', gender: 'neutral', provider: 'browser' },
];

export const GEMINI_VOICES: Voice[] = [
  { id: 'Puck', name: 'Puck', lang: 'en-US', gender: 'male', provider: 'gemini', description: 'Energetic and youthful' },
  { id: 'Charon', name: 'Charon', lang: 'en-US', gender: 'male', provider: 'gemini', description: 'Deep and authoritative' },
  { id: 'Kore', name: 'Kore', lang: 'en-US', gender: 'female', provider: 'gemini', description: 'Warm and friendly' },
  { id: 'Fenrir', name: 'Fenrir', lang: 'en-US', gender: 'male', provider: 'gemini', description: 'Rugged and mature' },
  { id: 'Zephyr', name: 'Zephyr', lang: 'en-US', gender: 'female', provider: 'gemini', description: 'Soft and airy' },
];

export const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'ja-JP', name: 'Japanese' },
];
