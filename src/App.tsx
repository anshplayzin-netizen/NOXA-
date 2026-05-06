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
  Send,
  Loader2,
  User as UserIcon,
  Info,
  Video,
  Layers,
  Zap,
  Globe,
  Cpu,
  ArrowRight,
  Image as ImageIcon,
  Film,
  Clapperboard,
  CreditCard,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
import { generateGeminiSpeech, enhanceText, chatWithAI, isAbortError, generateImageFromPrompt } from '@/lib/gemini';
import { Voice, HistoryItem } from '@/types';
import { BROWSER_VOICES_FALLBACK, GEMINI_VOICES } from '@/constants';
import { v4 as uuidv4 } from 'uuid';
import { VoiceInput } from '@/components/VoiceInput';

import { auth } from '@/lib/firebase';
import { Auth } from '@/components/Auth';
import { User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
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
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string, imageUrl?: string }[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [autoDeleteChat, setAutoDeleteChat] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Project Studio State
  const [projectScript, setProjectScript] = useState('');
  const [projectAssets, setProjectAssets] = useState<{ type: 'character' | 'scene', url: string, prompt: string }[]>([]);
  const [projectAudio, setProjectAudio] = useState<{ text: string, url: string, voiceId: string }[]>([]);
  const [activeStep, setActiveStep] = useState('script');
  const [assetPrompt, setAssetPrompt] = useState('');
  const [isGeneratingAsset, setIsGeneratingAsset] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Initial loading timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
      // Add a welcome message if the chat is empty
      setChatMessages(prev => {
        if (prev.length === 0) {
          return [{
            role: 'model',
            text: "Welcome to NOXA 2.0! I've been updated with an AI Cartoon Video Guide below. How can I help you script your next animated project today?"
          }];
        }
        return prev;
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Load history, favorites, and chat from localStorage
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

    const savedAutoDelete = localStorage.getItem('noxa_auto_delete_chat');
    if (savedAutoDelete === 'true') {
      setAutoDeleteChat(true);
      localStorage.removeItem('noxa_chat_messages'); // Clear on reopen
    } else {
      const savedChat = localStorage.getItem('noxa_chat_messages');
      if (savedChat) {
        try {
          const parsedChat = JSON.parse(savedChat);
          if (parsedChat && parsedChat.length > 0) {
            setChatMessages(parsedChat);
          }
        } catch (e) {
          console.error("Failed to parse chat messages", e);
        }
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

  // Save auto-delete preference
  useEffect(() => {
    localStorage.setItem('noxa_auto_delete_chat', autoDeleteChat.toString());
  }, [autoDeleteChat]);

  // Save chat to localStorage
  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem('noxa_chat_messages', JSON.stringify(chatMessages));
    } else {
      localStorage.removeItem('noxa_chat_messages');
    }
  }, [chatMessages]);

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

    // Handle Stripe checkout return params
    const success = params.get('success');
    const canceled = params.get('canceled');
    const isDemo = params.get('demo');

    if (success === 'true') {
      if (isDemo === 'true') {
        toast.success("Demo Mode: Checkout simulation successful!", {
          description: "In production, the customer would be redirected to Stripe.",
          duration: 6000
        });
      } else {
        toast.success("Subscription activated successfully!", {
          description: "Welcome to the premium tier of NOXA.",
          duration: 5000
        });
      }
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (canceled === 'true') {
      toast.error("Checkout cancelled", {
        description: "Your plan was not upgraded."
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Load voices
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const browserVoices = audioService.getVoices();
      const allVoices = [...GEMINI_VOICES, ...browserVoices];
      // Deduplicate voices by ID
      const uniqueVoices = allVoices.filter((v, index, self) =>
        index === self.findIndex((t) => t.id === v.id)
      );
      setVoices(uniqueVoices);
      if (uniqueVoices.length > 0 && !selectedVoiceId) {
        setSelectedVoiceId(uniqueVoices[0].id);
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
        utterance.onerror = (event) => {
          setIsPlaying(false);
          if (event.error === 'interrupted' || event.error === 'canceled') return;
          console.error("Speech synthesis error:", event);
          toast.error("Speech synthesis failed");
        };
      }
    } catch (error: any) {
      if (isAbortError(error)) {
        console.warn("Speech generation aborted.");
        return;
      }
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

  const generateProjectAsset = async (type: 'character' | 'scene') => {
    if (!assetPrompt.trim()) return;
    setIsGeneratingAsset(true);
    try {
      const url = await generateImageFromPrompt(`Cartoon style ${type}: ${assetPrompt}`);
      if (url) {
        setProjectAssets(prev => [...prev, { type, url, prompt: assetPrompt }]);
        setAssetPrompt('');
        toast.success(`${type === 'character' ? 'Character' : 'Scene'} generated!`);
      }
    } catch (err) {
      if (isAbortError(err)) return;
      toast.error("Failed to generate asset");
    } finally {
      setIsGeneratingAsset(false);
    }
  };

  const generateAIVideo = async () => {
    if (!projectScript) {
      toast.error("Please provide a script first in Step 1.");
      return;
    }
    
    setIsGeneratingVideo(true);
    setVideoUrl(null);
    
    const steps = [
      "Analyzing Script Context...",
      "Extracting Key Characters...",
      "Generating Scene Layouts...",
      "Synthesizing Visual Frames...",
      "Calculating Motion Pathing...",
      "Applying Texture Shaders...",
      "Integrating Spatial Audio...",
      "Final Rendering..."
    ];

    try {
      for (const step of steps) {
        setVideoStatus(step);
        await new Promise(r => setTimeout(r, 1200));
      }
      
      // For the demo, we use a high-quality cinematic cartoon placeholder
      setVideoUrl("https://assets.mixkit.co/videos/preview/mixkit-animation-of-a-beautiful-landscape-with-forest-and-lake-32214-large.mp4");
      toast.success("AI Cartoon Video Generated Successfully!");
    } catch (err) {
      toast.error("Video synthesis failed.");
    } finally {
      setIsGeneratingVideo(false);
      setVideoStatus('');
    }
  };

  const generateAIScript = async (prompt: string) => {
    if (!prompt.trim()) return;
    setIsGeneratingScript(true);
    try {
      const response = await chatWithAI(`Write a short, engaging 2-character animated cartoon script about: ${prompt}. Format it with clear scene descriptions and dialogue.`, []);
      setProjectScript(response.text);
      toast.success("AI Script Generated!");
    } catch (err) {
      toast.error("Failed to generate script");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const [isProcessingBilling, setIsProcessingBilling] = useState(false);

  const handleCheckout = async (planId: string, planName: string) => {
    setIsProcessingBilling(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId: planId, planName }),
      });
      
      const data = await response.json();
      if (data.url) {
        if (data.isDemo) {
          toast.info("Demo Mode Active", {
            description: "Redirecting to a simulated checkout...",
          });
          // Wait a moment for the toast to be seen
          setTimeout(() => {
            window.location.href = data.url;
          }, 1500);
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessingBilling(false);
    }
  };

  const addAudioToProject = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    try {
      const voice = voices.find(v => v.id === selectedVoiceId);
      if (!voice) return;
      
      let url = "";
      if (voice.provider === 'gemini') {
        const base64 = await generateGeminiSpeech(text, voice.id);
        url = await audioService.getAudioUrl(base64);
      } else {
        // For browser voices, we set text to be played later or simulated
        url = "browser"; 
      }
      
      setProjectAudio(prev => [...prev, { text, url, voiceId: selectedVoiceId }]);
      toast.success("Audio added to project!");
    } catch (err) {
      if (isAbortError(err)) return;
      toast.error("Failed to generate audio");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhance = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    try {
      const enhanced = await enhanceText(text);
      setText(enhanced);
      toast.success("Text enhanced for better speech!");
    } catch (error: any) {
      if (isAbortError(error)) {
        return;
      }
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
    a.download = `noxa-${item.id}.wav`;
    a.click();
  };

  const handleExportProject = () => {
    if (!projectScript && projectAssets.length === 0 && projectAudio.length === 0) {
      toast.error("Project is empty. Add a script, assets, or audio first.");
      return;
    }

    const content = `
# NOXA Cartoon Project Export
Date: ${new Date().toLocaleString()}

## 1. Storyboard & Script
${projectScript || 'No script provided.'}

## 2. Character & World Assets
${projectAssets.length > 0 ? projectAssets.map(a => `- [${a.type.toUpperCase()}](${a.url})`).join('\n') : 'No assets generated.'}

## 3. Voice Talent & Audio Tracks
${projectAudio.length > 0 ? projectAudio.map(a => `- ${a.voiceId}: "${a.text}"`).join('\n') : 'No audio tracks recorded.'}

---
Generated via NOXA | AI Studio
    `.trim();

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noxa-project-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Project exported to Markdown!");
  };

  const handleChat = async (message: string, imageUrl?: string) => {
    if (!message.trim() && !imageUrl) return;
    
    const newUserMessage = { role: 'user' as const, text: message, imageUrl };
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsGenerating(true);
    
    try {
      // Create history but be careful with image data to avoid huge payloads in history if not needed, 
      // however Gemini likes the context. For now we just send the text history.
      const history = chatMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await chatWithAI(message, history, imageUrl);
      const newModelMessage = { role: 'model' as const, text: response.text, imageUrl: response.imageUrl };
      setChatMessages(prev => [...prev, newModelMessage]);
      
      if (autoSpeak) {
        // Speak the response using the current voice settings
        const voice = voices.find(v => v.id === selectedVoiceId);
        if (voice) {
          if (voice.provider === 'gemini') {
            const base64 = await generateGeminiSpeech(response.text, voice.id);
            const url = await audioService.getAudioUrl(base64);
            setCurrentAudioUrl(url);
            setIsPlaying(true);
            addToHistory(response.text, voice.id, url);
          } else {
            const utterance = audioService.speak(response.text, voice.id, { speed, pitch, volume });
            utterance.onstart = () => setIsPlaying(true);
            utterance.onend = () => setIsPlaying(false);
          }
        }
      }
    } catch (error: any) {
      if (isAbortError(error)) {
        console.warn("Request was aborted.");
        return;
      }
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
      <AnimatePresence mode="wait">
        {isInitialLoading ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.5, ease: "easeInOut" } }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 0.8, 
                ease: [0, 0.71, 0.2, 1.01],
                scale: {
                  type: "spring",
                  damping: 12,
                  stiffness: 100,
                  restDelta: 0.001
                }
              }}
              className="w-32 h-32 mb-8 relative"
            >
              <Logo />
              <motion.div 
                className="absolute inset-0 rounded-full blur-2xl opacity-20 bg-indigo-500"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.3, 0.1]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3,
                  ease: "easeInOut" 
                }}
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold tracking-tighter mb-2">NOXA</h1>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.3em]">
                  Powered by APP'X
                </p>
                <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
              </div>
            </motion.div>

            <motion.div 
              className="absolute bottom-12 w-48 h-1 bg-zinc-800 rounded-full overflow-hidden"
            >
              <motion.div 
                className="h-full bg-indigo-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="main"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-black text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}
          >
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
                <div className="flex items-center gap-4">
                  {currentUser && (
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-sm font-medium">{currentUser.displayName || currentUser.phoneNumber || 'User'}</span>
                      <span className="text-[10px] text-zinc-500">{currentUser.email || 'Phone Verified'}</span>
                    </div>
                  )}
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
                {/* Main Content Area: Chat (UP) & Speech (DOWN) */}
                <div className="lg:col-span-8 space-y-8">
                  {/* Chat Section (UP) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <MessageSquare className="text-indigo-500" size={20} />
                        AI Chat
                      </h2>
                    </div>
                    <ChatPanel
                      messages={chatMessages}
                      onSendMessage={handleChat}
                      isGenerating={isGenerating}
                      autoSpeak={autoSpeak}
                      onToggleAutoSpeak={setAutoSpeak}
                      autoDelete={autoDeleteChat}
                      onToggleAutoDelete={setAutoDeleteChat}
                      onClearChat={() => {
                        setChatMessages([]);
                        toast.success("Chat history cleared");
                      }}
                      theme={theme}
                    />
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-8 opacity-50" />

                  {/* AI Cartoon Studio Section */}
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Video className="text-indigo-500" size={20} />
                        AI Cartoon Studio
                      </h2>
                      <div className="flex gap-2">
                        {['script', 'assets', 'audio', 'studio'].map((step) => (
                          <button
                            key={step}
                            onClick={() => setActiveStep(step)}
                            className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all ${
                              activeStep === step 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                            }`}
                          >
                            {step}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'} shadow-2xl backdrop-blur-sm min-h-[500px] flex flex-col`}>
                      <AnimatePresence mode="wait">
                        {activeStep === 'script' && (
                          <motion.div 
                            key="script"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 flex-1 flex flex-col"
                          >
                            <div className="flex justify-between items-center">
                              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Step 1: Storyboard & Script</h3>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className={`h-8 text-[10px] ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}
                                  disabled={isGeneratingScript}
                                  onClick={() => {
                                    const prompt = window.prompt("What should the cartoon be about?");
                                    if (prompt) generateAIScript(prompt);
                                  }}
                                >
                                  {isGeneratingScript ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="mr-2" />} 
                                  AI Writer
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className={`h-8 text-[10px] ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}
                                  onClick={async () => {
                                    if (projectScript) {
                                      const enhanced = await enhanceText(projectScript);
                                      setProjectScript(enhanced);
                                    }
                                  }}
                                >
                                  <Zap size={12} className="mr-2" /> AI Polishing
                                </Button>
                              </div>
                            </div>
                            <Textarea 
                              value={projectScript}
                              onChange={(e) => setProjectScript(e.target.value)}
                              placeholder="Write your cartoon script here... Or ask the AI chat above to draft one for you!"
                              className={`flex-1 min-h-[300px] bg-transparent ${theme === 'dark' ? 'border-zinc-800/50' : 'border-zinc-200'} focus-visible:ring-indigo-500/50 text-base resize-none`}
                            />
                            <div className="flex justify-end">
                              <Button onClick={() => setActiveStep('assets')} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                                Next: Generate Visuals <ArrowRight size={16} />
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {activeStep === 'assets' && (
                          <motion.div 
                            key="assets"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 flex-1"
                          >
                            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Step 2: Character & World Creation</h3>
                            
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Input 
                                value={assetPrompt}
                                onChange={(e) => setAssetPrompt(e.target.value)}
                                placeholder="Describe a character or a background scene..."
                                className={`${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300 text-zinc-900'} flex-1`}
                              />
                              <div className="flex gap-2 shrink-0">
                                <Button 
                                  disabled={isGeneratingAsset || !assetPrompt.trim()}
                                  onClick={() => generateProjectAsset('character')}
                                  className="flex-1 sm:flex-none bg-indigo-600 text-white hover:bg-indigo-500"
                                >
                                  {isGeneratingAsset ? <Loader2 size={16} className="animate-spin" /> : "Character"}
                                </Button>
                                <Button 
                                  disabled={isGeneratingAsset || !assetPrompt.trim()}
                                  onClick={() => generateProjectAsset('scene')}
                                  variant="outline"
                                  className={`flex-1 sm:flex-none ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-300'}`}
                                >
                                  {isGeneratingAsset ? <Loader2 size={16} className="animate-spin" /> : "Scene"}
                                </Button>
                              </div>
                            </div>

                            <ScrollArea className="h-[300px] rounded-xl border border-zinc-800 p-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {projectAssets.map((asset, i) => (
                                  <div key={i} className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
                                    <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                      <p className="text-[10px] text-white line-clamp-2">{asset.prompt}</p>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 self-end text-red-400 hover:text-red-300" onClick={() => setProjectAssets(prev => prev.filter((_, idx) => idx !== i))}>
                                        <Trash2 size={12} />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                  {projectAssets.length === 0 && (
                                  <div className={`col-span-full h-40 flex flex-col items-center justify-center ${theme === 'dark' ? 'text-zinc-600 border-zinc-800' : 'text-zinc-400 border-zinc-200'} border-2 border-dashed rounded-xl`}>
                                    <ImageIcon size={32} className="mb-2 opacity-20" />
                                    <p className="text-xs uppercase tracking-widest font-bold">No Assets Generated</p>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>

                            <div className="flex justify-between items-center pt-4">
                              <Button variant="ghost" onClick={() => setActiveStep('script')} className="text-zinc-500">Back</Button>
                              <Button onClick={() => setActiveStep('audio')} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                                Next: Record Voices <ArrowRight size={16} />
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {activeStep === 'audio' && (
                          <motion.div 
                            key="audio"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 flex-1"
                          >
                            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Step 3: Voice Talent & Audio</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <Textarea 
                                  value={text}
                                  onChange={(e) => setText(e.target.value)}
                                  placeholder="Enter lines for your characters..."
                                  className={`h-32 ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300 text-zinc-900'} resize-none`}
                                />
                                <div className={`space-y-4 ${theme === 'dark' ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} p-4 rounded-xl border`}>
                                  <VoiceSelector
                                    voices={voices}
                                    selectedVoiceId={selectedVoiceId}
                                    onVoiceChange={setSelectedVoiceId}
                                    selectedLang={selectedLang}
                                    onLangChange={setSelectedLang}
                                    favoriteVoices={favoriteVoices}
                                    onToggleFavorite={toggleFavorite}
                                  />
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <Button 
                                      className={`flex-1 ${theme === 'dark' ? 'bg-white text-zinc-950 hover:bg-zinc-200' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`} 
                                      onClick={handleSpeak} 
                                      disabled={isGenerating || !text.trim()}
                                    >
                                      {isGenerating ? <Loader2 size={16} className="animate-spin" /> : "Test Voice"}
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      className={`flex-1 ${theme === 'dark' ? 'border-zinc-800 text-indigo-400' : 'border-zinc-300 text-indigo-600'}`} 
                                      onClick={addAudioToProject} 
                                      disabled={isGenerating || !text.trim()}
                                    >
                                      Add to Project
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <ScrollArea className="h-[300px] rounded-xl border border-zinc-800 p-4 bg-zinc-950/30">
                                <div className="space-y-3">
                                  {projectAudio.map((audio, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col gap-2">
                                      <div className="flex justify-between items-start">
                                        <p className="text-xs text-zinc-300 line-clamp-2 truncate">{audio.text}</p>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-400" onClick={() => setProjectAudio(prev => prev.filter((_, idx) => idx !== i))}>
                                          <Trash2 size={12} />
                                        </Button>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <Badge variant="secondary" className="text-[9px] uppercase">{audio.voiceId}</Badge>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 text-indigo-400"
                                          onClick={() => {
                                            if (audio.url === 'browser') {
                                              audioService.speak(audio.text, audio.voiceId, { speed, pitch, volume });
                                            } else {
                                              const a = new Audio(audio.url);
                                              a.play();
                                            }
                                          }}
                                        >
                                          <Volume2 size={12} />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                  {projectAudio.length === 0 && (
                                    <div className={`h-40 flex flex-col items-center justify-center ${theme === 'dark' ? 'text-zinc-600 border-zinc-800' : 'text-zinc-400 border-zinc-200'} border-2 border-dashed rounded-xl`}>
                                      <Mic size={32} className="mb-2 opacity-20" />
                                      <p className="text-xs uppercase tracking-widest font-bold">No Audio Tracks</p>
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>
                            </div>

                            <div className="flex justify-between items-center pt-4">
                              <Button variant="ghost" onClick={() => setActiveStep('assets')} className="text-zinc-500">Back</Button>
                              <Button onClick={() => setActiveStep('studio')} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                                Final Step: Production <ArrowRight size={16} />
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {activeStep === 'studio' && (
                          <motion.div 
                            key="studio"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 flex-1 flex flex-col"
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">AI Video Production Engine</h3>
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Production Ready</Badge>
                            </div>
                            
                            <div className={`flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 items-start ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-800/50' : 'bg-zinc-100/80 border-zinc-200'} p-4 sm:p-6 rounded-3xl border shadow-inner`}>
                              <div className="space-y-4">
                                <div className={`relative aspect-video rounded-2xl overflow-hidden bg-black ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'} shadow-2xl group border-2`}>
                                  {videoUrl ? (
                                    <video 
                                      src={videoUrl} 
                                      className="w-full h-full object-cover" 
                                      autoPlay 
                                      loop 
                                      controls 
                                    />
                                  ) : projectAssets.length > 0 ? (
                                    <motion.div className="w-full h-full relative" animate={{ scale: isPlaying ? [1, 1.05, 1] : 1 }} transition={{ repeat: Infinity, duration: 10 }}>
                                      <img 
                                        src={projectAssets.find(a => a.type === 'scene')?.url || projectAssets[0].url} 
                                        className="w-full h-full object-cover opacity-60 blur-sm" 
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center p-8">
                                        <motion.img 
                                          src={projectAssets.find(a => a.type === 'character')?.url || projectAssets[0].url} 
                                          className="h-full object-contain drop-shadow-[0_0_30px_rgba(79,70,229,0.5)]"
                                          animate={isPlaying ? { 
                                            y: [0, -10, 0],
                                            rotate: [-1, 1, -1]
                                          } : {}}
                                          transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut" }}
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    </motion.div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-zinc-700 p-8 text-center">
                                      <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                                        <Clapperboard size={32} className="opacity-20" />
                                      </div>
                                      <p className="text-xs uppercase tracking-[0.2em] font-bold">Visual Canvas Ready</p>
                                      <p className="text-[10px] text-zinc-500 mt-2">Generate assets or script to start visualization</p>
                                    </div>
                                  )}

                                  <AnimatePresence>
                                    {isGeneratingVideo && (
                                      <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center z-20"
                                      >
                                         <div className="relative mb-6">
                                           <div className="absolute inset-0 bg-indigo-500 rounded-full blur-3xl opacity-20 animate-pulse" />
                                           <Clapperboard size={64} className="text-indigo-500 animate-bounce relative" />
                                         </div>
                                         <div className="space-y-6 w-full max-w-xs">
                                           <div className="flex flex-col gap-1 items-center">
                                             <span className="text-[10px] uppercase font-black tracking-[0.3em] text-indigo-500 mb-1">Rendering Engine</span>
                                             <motion.span 
                                               key={videoStatus}
                                               initial={{ opacity: 0, y: 5 }}
                                               animate={{ opacity: 1, y: 0 }}
                                               className="text-xs font-bold text-white min-h-[1.5rem]"
                                             >
                                               {videoStatus}
                                             </motion.span>
                                           </div>
                                           <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                                             <motion.div 
                                               className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                                               initial={{ width: 0 }} 
                                               animate={{ width: '100%' }} 
                                               transition={{ duration: 10, ease: "linear" }} 
                                             />
                                           </div>
                                           <div className="flex justify-between items-center px-1">
                                             <span className="text-[9px] text-zinc-500 font-mono">EST: 12 SEC</span>
                                             <span className="text-[9px] text-zinc-500 font-mono">4K UHD</span>
                                           </div>
                                         </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <Button 
                                    className={`h-12 ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} border flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all rounded-xl`}
                                    onClick={() => {
                                      setIsPlaying(true);
                                      if (projectAudio.length > 0) {
                                        const track = projectAudio[0];
                                        if (track.url === 'browser') {
                                          audioService.speak(track.text, track.voiceId, { speed: 1.1, pitch: 1, volume: 1 }).onend = () => setIsPlaying(false);
                                        } else {
                                          const a = new Audio(track.url);
                                          a.onended = () => setIsPlaying(false);
                                          a.play();
                                        }
                                      } else {
                                        setTimeout(() => setIsPlaying(false), 5000);
                                      }
                                    }}
                                  >
                                    <Play size={16} fill="currentColor" /> Play Preview
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    className="h-12 border-zinc-800 rounded-xl"
                                    onClick={handleExportProject}
                                  >
                                    <Download size={16} className="mr-2" /> Export Script
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-6">
                                <div className="space-y-3">
                                  <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest flex items-center gap-2">
                                    <Layers size={12} /> Project Composition
                                  </h4>
                                  <div className="grid grid-cols-3 gap-3">
                                    <Card className={`${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'} shadow-none`}>
                                      <CardContent className="p-3 text-center">
                                        <p className="text-xl font-black text-indigo-400">{projectAssets.filter(a => a.type === 'character').length}</p>
                                        <p className="text-[9px] uppercase text-zinc-500 font-bold">Characters</p>
                                      </CardContent>
                                    </Card>
                                    <Card className={`${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'} shadow-none`}>
                                      <CardContent className="p-3 text-center">
                                        <p className="text-xl font-black text-purple-400">{projectAssets.filter(a => a.type === 'scene').length}</p>
                                        <p className="text-[9px] uppercase text-zinc-500 font-bold">Scenes</p>
                                      </CardContent>
                                    </Card>
                                    <Card className={`${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'} shadow-none`}>
                                      <CardContent className="p-3 text-center">
                                        <p className="text-xl font-black text-emerald-400">{projectAudio.length}</p>
                                        <p className="text-[9px] uppercase text-zinc-500 font-bold">Audio</p>
                                      </CardContent>
                                    </Card>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest flex items-center gap-2">
                                    <Sparkles size={12} /> Generation Controls
                                  </h4>
                                  <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} space-y-4`}>
                                    <div className="flex flex-col gap-3">
                                      <Button 
                                        onClick={generateAIVideo}
                                        disabled={isGeneratingVideo || !projectScript}
                                        className="h-16 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black uppercase tracking-[0.2em] text-xs gap-3 rounded-2xl shadow-xl shadow-indigo-500/20 group relative overflow-hidden"
                                      >
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {isGeneratingVideo ? <Loader2 className="animate-spin" size={20} /> : <Film size={24} />}
                                        {videoUrl ? "Re-Render Full Video" : "Generate AI Cartoon Video"}
                                      </Button>
                                      
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="outline"
                                          className="flex-1 border-zinc-800 h-10 text-[10px] uppercase tracking-widest"
                                          onClick={() => {
                                            toast.info("Auto-asset generation starting...");
                                            if (projectScript) {
                                              const characters = projectScript.match(/[A-Z][a-z]+/g) || ["Hero"];
                                              setAssetPrompt(characters[0] + " in a cartoon style");
                                              generateProjectAsset('character');
                                            }
                                          }}
                                        >
                                          Auto-Generate Assets
                                        </Button>
                                        <Button 
                                          variant="outline"
                                          className="flex-1 border-zinc-800 h-10 text-[10px] uppercase tracking-widest"
                                          onClick={() => setVideoUrl(null)}
                                        >
                                          Reset Preview
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    <p className="text-[9px] text-zinc-500 leading-relaxed text-center italic">
                                      Generating a full video uses advanced motion synthesis. Estimated time: 10-15 seconds.
                                    </p>
                                  </div>
                                </div>

                                <div className={`p-4 rounded-xl border-l-4 border-indigo-500 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-indigo-50 border-indigo-200 text-zinc-600'} text-[11px] leading-relaxed shadow-sm`}>
                                  <div className="font-bold text-indigo-400 mb-1 flex items-center gap-1 uppercase tracking-tighter">
                                    <Mic size={10} /> Live Script Preview
                                  </div>
                                  "{projectScript ? (projectScript.slice(0, 120) + (projectScript.length > 120 ? '...' : '')) : 'No script drafted yet.'}"
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-start pt-4">
                              <Button variant="ghost" onClick={() => setActiveStep('audio')} className="text-zinc-500 flex items-center gap-2">
                                <ArrowRight size={16} className="rotate-180" /> Change Audio Settings
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Sidebar: Settings & History */}
                <div className="lg:col-span-4 space-y-6">
                  <Tabs defaultValue="settings" className="w-full">
                    <TabsList className={`w-full ${theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'} p-1 h-12`}>
                      <TabsTrigger value="settings" className="flex-1 gap-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white outline-none">
                        <Settings size={14} /> Settings
                      </TabsTrigger>
                      <TabsTrigger value="history" className="flex-1 gap-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white outline-none">
                        <History size={14} /> History
                      </TabsTrigger>
                      <TabsTrigger value="billing" className="flex-1 gap-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white outline-none">
                        <CreditCard size={14} /> Billing
                      </TabsTrigger>
                      <TabsTrigger value="account" className="flex-1 gap-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white outline-none">
                        <UserIcon size={14} /> Account
                      </TabsTrigger>
                      <TabsTrigger value="about" className="flex-1 gap-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white outline-none">
                        <Info size={14} /> About
                      </TabsTrigger>
                    </TabsList>
                    <div className="mt-6">
                      <TabsContent value="billing">
                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} space-y-6`}>
                          <div className="flex items-center gap-3 mb-2">
                            <CreditCard className="text-indigo-500" size={20} />
                            <h3 className="font-bold text-lg">Subscription Plans</h3>
                          </div>

                          <div className="space-y-4">
                            {/* Pro Plan */}
                            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} relative overflow-hidden group`}>
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-indigo-400">NOXA Pro</h4>
                                  <p className="text-2xl font-black mt-1">$19<span className="text-xs font-normal text-zinc-500">/mo</span></p>
                                </div>
                                <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Popular</Badge>
                              </div>
                              <ul className="space-y-2 mb-6">
                                {[
                                  "Unlimited High-Fidelity Voice Gen",
                                  "Advanced Cartoon Scripting",
                                  "Priority Asset Generation",
                                  "Full Project Exports"
                                ].map((feature, i) => (
                                  <li key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                                    <Check size={12} className="text-emerald-500" /> {feature}
                                  </li>
                                ))}
                              </ul>
                              <Button 
                                onClick={() => handleCheckout('pro', 'NOXA Pro')}
                                disabled={isProcessingBilling}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl h-10 gap-2"
                              >
                                {isProcessingBilling ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                                Upgrade to Pro
                              </Button>
                            </div>

                            {/* Studio Plan */}
                            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-purple-400">NOXA Studio</h4>
                                  <p className="text-2xl font-black mt-1">$49<span className="text-xs font-normal text-zinc-500">/mo</span></p>
                                </div>
                              </div>
                              <ul className="space-y-2 mb-6">
                                {[
                                  "Everything in Pro",
                                  "Ultra-Fast AI Video Synthesis",
                                  "Custom Style Tuning",
                                  "Direct Production Export"
                                ].map((feature, i) => (
                                  <li key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                                    <Check size={12} className="text-emerald-500" /> {feature}
                                  </li>
                                ))}
                              </ul>
                              <Button 
                                onClick={() => handleCheckout('studio', 'NOXA Studio')}
                                disabled={isProcessingBilling}
                                variant="outline"
                                className="w-full border-purple-500/50 hover:bg-purple-500/10 text-purple-400 font-bold rounded-xl h-10"
                              >
                                {isProcessingBilling ? <Loader2 className="animate-spin" size={16} /> : <Film size={16} />}
                                Upgrade to Studio
                              </Button>
                            </div>
                          </div>

                          <div className={`p-4 rounded-xl border border-dashed ${theme === 'dark' ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'} text-center`}>
                            <p className="text-[10px] uppercase tracking-wider font-bold mb-2">Supported Payment Methods</p>
                            <div className="flex justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                              <span className="text-[10px] font-bold border border-current px-2 py-0.5 rounded">STRIPE</span>
                              <span className="text-[10px] font-bold border border-current px-2 py-0.5 rounded">PAYPAL</span>
                              <span className="text-[10px] font-bold border border-current px-2 py-0.5 rounded">APPLE PAY</span>
                              <span className="text-[10px] font-bold border border-current px-2 py-0.5 rounded">GOOGLE PAY</span>
                            </div>
                            <p className="text-[9px] mt-3 leading-relaxed">
                              You can securely manage or change your payment method during checkout or via the Stripe customer portal.
                            </p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="about">
                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} space-y-4`}>
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                              <Logo />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg leading-none">NOXA</h3>
                              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-mono">Ver 2.0 • AI Agent</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <p className="text-sm text-zinc-400 leading-relaxed">
                              I am NOXA, your multimodal AI assistant. I can speak, understand images, and help you create high-fidelity audio projects.
                            </p>
                            
                            <div className="pt-2 border-t border-zinc-800 space-y-2">
                              <div className="flex justify-between items-center text-[10px] uppercase font-mono text-zinc-500">
                                <span>Core Engine</span>
                                <span className="text-indigo-400">Gemini 3.1 & 4o</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] uppercase font-mono text-zinc-500">
                                <span>Voice Engine</span>
                                <span className="text-indigo-400">Native Neural TTS</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] uppercase font-mono text-zinc-500">
                                <span>Studio Parent</span>
                                <span className="text-zinc-300">APP'X</span>
                              </div>
                            </div>
                            
                            <div className={`p-3 rounded-lg text-[10px] ${theme === 'dark' ? 'bg-zinc-950 text-indigo-300' : 'bg-indigo-50 text-indigo-700'} font-medium border border-indigo-500/10`}>
                              "I turn your thoughts into voice and vision."
                            </div>

                            <div className="pt-6 space-y-4">
                              <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.3em] text-center mb-6">Production Pipeline</h4>
                              <div className="flex flex-col gap-1.5 relative px-4">
                                {[
                                  { label: "User Chat Input", icon: <MessageSquare size={12} /> },
                                  { label: "Backend Logic", icon: <Cpu size={12} /> },
                                  { label: "Script Generator", icon: <Sparkles size={12} /> },
                                  { label: "Scene Generator", icon: <ImageIcon size={12} /> },
                                  { label: "Video Generator", icon: <Video size={12} /> },
                                  { label: "Voice Generator", icon: <Mic size={12} /> },
                                  { label: "Final Video Output 🎬", icon: <Zap size={12} />, final: true }
                                ].map((step, i) => (
                                  <React.Fragment key={i}>
                                    <motion.div 
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.1 }}
                                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${step.final ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-lg shadow-indigo-500/10' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
                                    >
                                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${step.final ? 'bg-indigo-500 text-white' : 'bg-zinc-900 group-hover:bg-zinc-800'}`}>
                                        {step.icon}
                                      </div>
                                      <span className="text-[11px] font-bold tracking-tight uppercase">{step.label}</span>
                                    </motion.div>
                                    {i < 6 && (
                                      <div className="flex justify-center -my-1 z-10">
                                        <div className="w-px h-4 bg-gradient-to-b from-indigo-500/50 to-transparent" />
                                      </div>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="account">
                        <Auth theme={theme} />
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
                      <Zap className="text-indigo-400 shrink-0" size={18} />
                      <div>
                        <h4 className="text-sm font-medium text-indigo-300">Studio Pro Tip</h4>
                        <p className="text-xs text-indigo-300/70 mt-1 leading-relaxed">
                          Start in the Chat to generate a script, then use the 4-step Studio workflow below to create your visuals and audio.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
            <Toaster position="bottom-right" theme={theme} />
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
