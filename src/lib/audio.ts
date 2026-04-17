import { Voice } from '../types';

export class AudioService {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  getVoices(): Voice[] {
    const voices = this.synth.getVoices();
    return voices.map(v => ({
      id: v.voiceURI,
      name: v.name,
      lang: v.lang,
      gender: v.name.toLowerCase().includes('female') ? 'female' : 'male',
      provider: 'browser'
    }));
  }

  speak(text: string, voiceId: string, settings: { speed: number; pitch: number; volume: number }) {
    this.stop();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = this.synth.getVoices();
    const voice = voices.find(v => v.voiceURI === voiceId);
    
    if (voice) utterance.voice = voice;
    utterance.rate = settings.speed;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;
    
    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    
    return utterance;
  }

  pause() {
    this.synth.pause();
  }

  resume() {
    this.synth.resume();
  }

  stop() {
    this.synth.cancel();
    this.currentUtterance = null;
  }

  async getAudioUrl(base64: string, sampleRate: number = 24000) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Int16Array(len / 2);
    for (let i = 0; i < len; i += 2) {
      bytes[i / 2] = (binary.charCodeAt(i + 1) << 8) | binary.charCodeAt(i);
    }

    const wavBlob = this.pcmToWav(bytes, sampleRate);
    return URL.createObjectURL(wavBlob);
  }

  private pcmToWav(pcmData: Int16Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + pcmData.length * 2, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, pcmData.length * 2, true);

    // write PCM samples
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

export const audioService = new AudioService();
