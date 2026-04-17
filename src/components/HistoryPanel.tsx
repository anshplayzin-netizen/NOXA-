import React from 'react';
import { HistoryItem } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Play, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HistoryPanelProps {
  items: HistoryItem[];
  onPlay: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onDownload: (item: HistoryItem) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ items, onPlay, onDelete, onDownload }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-400 mb-2">
        <Clock size={16} />
        <h3 className="text-sm font-medium uppercase tracking-wider">History</h3>
      </div>
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="text-center py-8 text-zinc-600 text-sm italic">
              No history yet. Start generating!
            </div>
          )}
          {items.map(item => (
            <div
              key={item.id}
              className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-lg group hover:border-zinc-700 transition-colors"
            >
              <p className="text-sm text-zinc-300 line-clamp-2 mb-2">{item.text}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-indigo-400"
                    onClick={() => onPlay(item)}
                  >
                    <Play size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-green-400"
                    onClick={() => onDownload(item)}
                  >
                    <Download size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-red-400"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
