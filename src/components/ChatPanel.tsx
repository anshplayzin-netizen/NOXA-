import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { Logo } from './Logo';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isGenerating: boolean;
  autoSpeak: boolean;
  onToggleAutoSpeak: (val: boolean) => void;
  theme?: 'dark' | 'light';
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isGenerating,
  autoSpeak,
  onToggleAutoSpeak,
  theme = 'dark',
}) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSendMessage(input);
      setInput('');
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
        <div className="flex items-center gap-2">
          <Label htmlFor="auto-speak" className="text-[10px] uppercase tracking-wider text-zinc-500">Auto-Speak</Label>
          <Switch 
            id="auto-speak" 
            checked={autoSpeak} 
            onCheckedChange={onToggleAutoSpeak}
          />
          {autoSpeak ? <Volume2 size={14} className={theme === 'dark' ? 'text-white' : 'text-indigo-600'} /> : <VolumeX size={14} className="text-zinc-600" />}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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

      <form onSubmit={handleSubmit} className={`p-4 ${theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50/50 border-zinc-100'} border-t flex gap-2`}>
        <Input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className={`${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'} focus-visible:ring-indigo-500`}
          disabled={isGenerating}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!input.trim() || isGenerating}
          className={`${theme === 'dark' ? 'bg-white hover:bg-zinc-200 text-zinc-950' : 'bg-indigo-600 hover:bg-indigo-500 text-white'} shrink-0`}
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};
