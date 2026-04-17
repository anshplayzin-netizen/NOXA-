/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Square, 
  Download, 
  Sparkles, 
  History, 
  Settings, 
  Mic, 
  Copy, 
  Share2, 
  Moon, 
  Sun,
  Volume2,
  Trash2,
  MessageSquare,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { VoiceSelector } from '@/components/VoiceSelector';
import { SettingsPanel } from '@/components/SettingsPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { Waveform } from '@/components/Waveform';
import { Logo } from '@/components/Logo';
import { audioService } from '@/lib/audio';
import { generateGeminiSpeech, enhanceText, chatWithAI } from '@/lib/gemini';
import { Voice, HistoryItem } from '@/types';
import { BROWSER_VOICES_FALLBACK, GEMINI_VOICES } from '@/constants';
import { v4 as uuidv4 } from 'uuid';
import { VoiceInput } from '@/components/VoiceInput';

export default function App() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [emotion, setEmotion] = useState('neutral');
  const [favoriteVoices, setFavoriteVoices] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Load history and favorites from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('voxgen_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const savedFavorites = localStorage.getItem('voxgen_favorites');
    if (savedFavorites) {
      try {
        setFavoriteVoices(JSON.parse(savedFavorites));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('voxgen_history', JSON.stringify(history));
    }
  }, [history]);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('voxgen_favorites', JSON.stringify(favoriteVoices));
  }, [favoriteVoices]);

  const toggleFavorite = (voiceId: string) => {
    setFavoriteVoices(prev => 
      prev.includes(voiceId) 
        ? prev.filter(id => id !== voiceId) 
        : [...prev, voiceId]
    );
  };

  const EMOTIONS = [
    { id: 'neutral', name: 'Neutral' },
    { id: 'happy', name: 'Happy' },
    { id: 'sad', name: 'Sad' },
    { id: 'energetic', name: 'Energetic' },
    { id: 'calm', name: 'Calm' },
  ];

  // Load from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlText = params.get('text');
    const urlVoiceId = params.get('voiceId');
    const urlSpeed = params.get('speed');
    const urlPitch = params.get('pitch');
    const urlVolume = params.get('volume');

    if (urlText) setText(urlText);
    if (urlVoiceId) setSelectedVoiceId(urlVoiceId);
    if (urlSpeed) setSpeed(parseFloat(urlSpeed));
    if (urlPitch) setPitch(parseFloat(urlPitch));
    if (urlVolume) setVolume(parseFloat(urlVolume));
  }, []);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const browserVoices = audioService.getVoices();
      const allVoices = [...GEMINI_VOICES, ...browserVoices];
      setVoices(allVoices);
      if (allVoices.length > 0 && !selectedVoiceId) {
        setSelectedVoiceId(allVoices[0].id);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Handle TTS
  const handleSpeak = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text");
      return;
    }

    const voice = voices.find(v => v.id === selectedVoiceId);
    if (!voice) return;

    setIsGenerating(true);
    try {
      if (voice.provider === 'gemini') {
        const emotionPrefix = emotion !== 'neutral' ? `Say this ${emotion}ly: ` : '';
        const base64 = await generateGeminiSpeech(emotionPrefix + text, voice.id);
        const url = await audioService.getAudioUrl(base64);
        setCurrentAudioUrl(url);
        setIsPlaying(true);
        
        // Add to history
        addToHistory(text, voice.id, url);
      } else {
        const utterance = audioService.speak(text, voice.id, { speed, pitch, volume });
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => {
          setIsPlaying(false);
          toast.error("Speech synthesis failed");
        };
      }
    } catch (error) {
      toast.error("Failed to generate speech");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    audioService.stop();
    setIsPlaying(false);
  };

  const handleEnhance = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    try {
      const enhanced = await enhanceText(text);
      setText(enhanced);
      toast.success("Text enhanced for better speech!");
    } catch (error) {
      toast.error("Failed to enhance text");
    } finally {
      setIsGenerating(false);
    }
  };

  const addToHistory = (text: string, voiceId: string, audioUrl?: string) => {
    const newItem: HistoryItem = {
      id: uuidv4(),
      text,
      voiceId,
      settings: { speed, pitch, volume },
      timestamp: Date.now(),
      audioUrl,
    };
    setHistory(prev => [newItem, ...prev].slice(0, 20));
  };

  const handleDownload = (item: HistoryItem) => {
    if (!item.audioUrl) {
      toast.error("No audio file available for download");
      return;
    }
    const a = document.createElement('a');
    a.href = item.audioUrl;
    a.download = `voxgen-${item.id}.wav`;
    a.click();
  };

  const handleChat = async (message: string) => {
    if (!message.trim()) return;
    
    const newUserMessage = { role: 'user' as const, text: message };
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsGenerating(true);
    
    try {
      const history = chatMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await chatWithAI(message, history);
      const newModelMessage = { role: 'model' as const, text: response };
      setChatMessages(prev => [...prev, newModelMessage]);
      
      if (autoSpeak) {
        // Speak the response using the current voice settings
        const voice = voices.find(v => v.id === selectedVoiceId);
        if (voice) {
          if (voice.provider === 'gemini') {
            const base64 = await generateGeminiSpeech(response, voice.id);
            const url = await audioService.getAudioUrl(base64);
            setCurrentAudioUrl(url);
            setIsPlaying(true);
            addToHistory(response, voice.id, url);
          } else {
            const utterance = audioService.speak(response, voice.id, { speed, pitch, volume });
            utterance.onstart = () => setIsPlaying(true);
            utterance.onend = () => setIsPlaying(false);
          }
        }
      }
    } catch (error) {
      toast.error("Failed to get AI response");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success("Text copied to clipboard");
  };

  return (
    <TooltipProvider>
      <div className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-black text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <header className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'} rounded-xl flex items-center justify-center shadow-sm overflow-hidden border ${theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <div className="relative w-full h-full flex items-center justify-center p-1">
                  <Logo />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">NOXA</h1>
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Powered by APP'X</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full hover:bg-zinc-800"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Input Area */}
            <div className="lg:col-span-8 space-y-6">
              <Card className={`${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'} shadow-2xl backdrop-blur-sm overflow-hidden`}>
                <CardHeader className={`border-b ${theme === 'dark' ? 'border-zinc-800/50' : 'border-zinc-100'} pb-4`}>
                  <div className="flex justify-between items-center">
                    <CardTitle className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'} flex items-center gap-2`}>
                      <Mic size={14} /> Input Text
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <VoiceInput onTranscript={(transcript) => setText(prev => prev + ' ' + transcript)} />
                      <span className="text-[10px] font-mono text-zinc-500">{text.length} / 5000</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Textarea
                    placeholder="Enter text to convert to speech..."
                    className={`min-h-[240px] bg-transparent border-none focus-visible:ring-0 text-lg resize-none ${theme === 'dark' ? 'placeholder:text-zinc-700' : 'placeholder:text-zinc-300'}`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div className={`flex flex-wrap gap-2 mt-4 pt-4 border-t ${theme === 'dark' ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleEnhance}
                      disabled={isGenerating || !text.trim()}
                      className={`${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-600'} gap-2`}
                    >
                      <Sparkles size={14} className={theme === 'dark' ? 'text-white' : 'text-indigo-600'} />
                      AI Enhance
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCopy}
                      className={`${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-600'} gap-2`}
                    >
                      <Copy size={14} />
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setText('')}
                      className={`${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-600'} gap-2`}
                    >
                      <Trash2 size={14} />
                      Clear
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const params = new URLSearchParams({
                          text,
                          voiceId: selectedVoiceId,
                          speed: speed.toString(),
                          pitch: pitch.toString(),
                          volume: volume.toString(),
                        });
                        const url = `${window.location.origin}?${params.toString()}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Share link copied to clipboard!");
                      }}
                      className={`${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-600'} gap-2`}
                    >
                      <Share2 size={14} />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Controls & Waveform */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className={`${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <CardContent className="pt-6 space-y-6">
                    <VoiceSelector
                      voices={voices}
                      selectedVoiceId={selectedVoiceId}
                      onVoiceChange={setSelectedVoiceId}
                      selectedLang={selectedLang}
                      onLangChange={setSelectedLang}
                      favoriteVoices={favoriteVoices}
                      onToggleFavorite={toggleFavorite}
                    />
                    
                    {voices.find(v => v.id === selectedVoiceId)?.provider === 'gemini' && (
                      <div className="space-y-2">
                        <Label className={`text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} uppercase tracking-wider`}>Emotion</Label>
                        <Select value={emotion} onValueChange={setEmotion}>
                          <SelectTrigger className={`${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                            <SelectValue placeholder="Select Emotion" />
                          </SelectTrigger>
                          <SelectContent className={`${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
                            {EMOTIONS.map(e => (
                              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        className={`flex-1 ${theme === 'dark' ? 'bg-white hover:bg-zinc-200 text-zinc-950' : 'bg-indigo-600 hover:bg-indigo-500 text-white'} gap-2 h-12 shadow-lg`}
                        onClick={handleSpeak}
                        disabled={isGenerating || !text.trim()}
                      >
                        {isGenerating ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          >
                            <Settings size={18} />
                          </motion.div>
                        ) : (
                          <Play size={18} fill="currentColor" />
                        )}
                        {isGenerating ? 'Generating...' : 'Generate Speech'}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-12 w-12 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'}`}
                        onClick={handleStop}
                        disabled={!isPlaying}
                      >
                        <Square size={18} fill="currentColor" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'} flex flex-col justify-center p-6`}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Waveform Preview</span>
                      {isPlaying && (
                        <motion.div 
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="flex items-center gap-1.5"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${theme === 'dark' ? 'bg-white' : 'bg-indigo-500'}`} />
                          <span className={`text-[10px] ${theme === 'dark' ? 'text-zinc-300' : 'text-indigo-600'} font-mono`}>LIVE</span>
                        </motion.div>
                      )}
                    </div>
                    <div className={`h-20 ${theme === 'dark' ? 'bg-zinc-950/50 border-zinc-800/50' : 'bg-zinc-50 border-zinc-100'} rounded-lg border flex items-center justify-center p-4`}>
                      {currentAudioUrl ? (
                        <Waveform 
                          url={currentAudioUrl} 
                          isPlaying={isPlaying} 
                          onFinish={() => setIsPlaying(false)} 
                        />
                      ) : (
                        <div className="text-zinc-700 text-xs font-mono">NO AUDIO GENERATED</div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <Tabs defaultValue="chat" className="w-full">
                <TabsList className={`w-full ${theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'} p-1 h-12`}>
                  <TabsTrigger value="chat" className="flex-1 gap-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
                    <MessageSquare size={14} /> Chat
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex-1 gap-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
                    <Settings size={14} /> Settings
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 gap-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
                    <History size={14} /> History
                  </TabsTrigger>
                </TabsList>
                <div className="mt-6">
                  <TabsContent value="chat">
                    <ChatPanel
                      messages={chatMessages}
                      onSendMessage={handleChat}
                      isGenerating={isGenerating}
                      autoSpeak={autoSpeak}
                      onToggleAutoSpeak={setAutoSpeak}
                      theme={theme}
                    />
                  </TabsContent>
                  <TabsContent value="settings">
                    <SettingsPanel
                      speed={speed}
                      pitch={pitch}
                      volume={volume}
                      onSpeedChange={setSpeed}
                      onPitchChange={setPitch}
                      onVolumeChange={setVolume}
                      theme={theme}
                    />
                  </TabsContent>
                  <TabsContent value="history">
                    <HistoryPanel
                      items={history}
                      onPlay={(item) => {
                        if (item.audioUrl) {
                          setCurrentAudioUrl(item.audioUrl);
                          setIsPlaying(true);
                        } else {
                          setText(item.text);
                          setSelectedVoiceId(item.voiceId);
                          setSpeed(item.settings.speed);
                          setPitch(item.settings.pitch);
                          setVolume(item.settings.volume);
                        }
                      }}
                      onDelete={(id) => setHistory(prev => prev.filter(i => i.id !== id))}
                      onDownload={handleDownload}
                    />
                  </TabsContent>
                </div>
              </Tabs>

              <Card className="bg-indigo-600/10 border-indigo-500/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <Sparkles className="text-indigo-400 shrink-0" size={18} />
                  <div>
                    <h4 className="text-sm font-medium text-indigo-300">Pro Tip</h4>
                    <p className="text-xs text-indigo-300/70 mt-1 leading-relaxed">
                      Use Gemini voices for more natural, human-like expressions. They support emotional context in the text!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <Toaster position="bottom-right" theme={theme} />
      </div>
    </TooltipProvider>
  );
}
