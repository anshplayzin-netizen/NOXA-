import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Volume2, VolumeX, Mic, ChevronUp, ChevronDown, Image as ImageIcon, X, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

import { Logo } from './Logo';

export interface Message {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string, imageUrl?: string) => void;
  isGenerating: boolean;
  autoSpeak: boolean;
  onToggleAutoSpeak: (val: boolean) => void;
  autoDelete?: boolean;
  onToggleAutoDelete?: (val: boolean) => void;
  onClearChat?: () => void;
  theme?: 'dark' | 'light';
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isGenerating,
  autoSpeak,
  onToggleAutoSpeak,
  autoDelete = false,
  onToggleAutoDelete,
  onClearChat,
  theme = 'dark',
}) => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [browserSupportsSpeech, setBrowserSupportsSpeech] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (viewport) {
        viewport.scrollTop = 0;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
      const isAtTop = target.scrollTop <= 100;
      
      // Show buttons if we are neither at the very top nor at the very bottom
      // or simply show them if messages exist
      if (messages.length > 5) {
        setShowScrollButtons(true);
      }
    };

    const viewport = scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
    if (viewport) {
      viewport.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (viewport) {
        viewport.removeEventListener('scroll', handleScroll);
      }
    };
  }, [messages.length]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setBrowserSupportsSpeech(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onstart = () => {
          setIsListening(true);
        };

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => prev ? `${prev} ${transcript}` : transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === 'aborted' || event.error === 'no-speech') return;
          toast.error("Speech recognition failed");
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImage) && !isGenerating) {
      onSendMessage(input, selectedImage || undefined);
      setInput('');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`flex flex-col h-[500px] ${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'} border rounded-xl overflow-hidden shadow-xl`}>
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-100 bg-zinc-50/50'} flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'} rounded flex items-center justify-center border ${theme === 'dark' ? 'border-zinc-700' : 'border-zinc-200'} p-0.5`}>
            <Logo />
          </div>
          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>NOXA</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-delete" className="text-[10px] uppercase tracking-wider text-zinc-500">Auto-Clear</Label>
            <Switch 
              id="auto-delete" 
              checked={autoDelete} 
              onCheckedChange={onToggleAutoDelete}
            />
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            className="h-8 w-8 text-zinc-500 hover:text-red-500 rounded-full"
            title="Clear all messages"
          >
            <Trash2 size={14} />
          </Button>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Label htmlFor="auto-speak" className="text-[10px] uppercase tracking-wider text-zinc-500">Speak</Label>
            <Switch 
              id="auto-speak" 
              checked={autoSpeak} 
              onCheckedChange={onToggleAutoSpeak}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden group">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-zinc-600">
                <Bot size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm">Start a conversation with the AI.</p>
                <p className="text-xs mt-1">Responses can be automatically read aloud.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? theme === 'dark' ? 'bg-white text-zinc-950 rounded-tr-none' : 'bg-indigo-600 text-white rounded-tr-none'
                    : theme === 'dark' ? 'bg-zinc-800 text-zinc-100 rounded-tl-none' : 'bg-zinc-100 text-zinc-900 rounded-tl-none'
                }`}>
                  <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] uppercase font-bold">
                    {m.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                    {m.role === 'user' ? 'You' : 'NOXA'}
                  </div>
                  {m.text}
                  {m.imageUrl && (
                    <div className="mt-2 text-center">
                      <img 
                        src={m.imageUrl} 
                        alt="AI generated" 
                        className="rounded-lg max-w-full h-auto mt-2" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex justify-start">
                <div className={`${theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'} p-3 rounded-2xl rounded-tl-none text-sm animate-pulse flex items-center gap-2`}>
                  <Bot size={10} />
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {showScrollButtons && (
          <div className="absolute right-4 bottom-4 flex flex-col gap-2 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full shadow-lg opacity-80 hover:opacity-100"
              onClick={scrollToTop}
              title="Scroll to top"
            >
              <ChevronUp size={16} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full shadow-lg opacity-80 hover:opacity-100"
              onClick={scrollToBottom}
              title="Scroll to bottom"
            >
              <ChevronDown size={16} />
            </Button>
          </div>
        )}
      </div>

      {selectedImage && (
        <div className={`px-4 py-2 flex items-center gap-3 border-t ${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
          <div className="relative w-12 h-12 rounded overflow-hidden border border-zinc-700">
            <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
            <button 
              onClick={clearSelectedImage}
              className="absolute -top-1 -right-1 bg-zinc-950 text-white rounded-full p-0.5 hover:bg-zinc-800"
            >
              <X size={10} />
            </button>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Image Selected</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`p-4 ${theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50/50 border-zinc-100'} border-t flex gap-2 relative`}>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleImageSelect} 
          className="hidden" 
        />
        
        <div className="flex gap-1 shrink-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className={`${theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'} rounded-full`}
            title="Upload image"
          >
            <ImageIcon size={18} />
          </Button>

          {browserSupportsSpeech && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={toggleListening}
              className={`${isListening ? 'text-red-500 bg-red-500/10' : theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'} rounded-full`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              <Mic size={18} className={isListening ? "animate-pulse" : ""} />
            </Button>
          )}
        </div>

        <Input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? "Listening..." : selectedImage ? "Add a caption..." : "Type a message..."}
          className={`${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'} focus-visible:ring-indigo-500`}
          disabled={isGenerating}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={(!input.trim() && !selectedImage) || isGenerating}
          className={`${theme === 'dark' ? 'bg-white hover:bg-zinc-200 text-zinc-950' : 'bg-indigo-600 hover:bg-indigo-500 text-white'} shrink-0 rounded-full`}
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};

