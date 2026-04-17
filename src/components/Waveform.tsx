import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformProps {
  url: string | null;
  isPlaying: boolean;
  onFinish?: () => void;
}

export const Waveform: React.FC<WaveformProps> = ({ url, isPlaying, onFinish }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4f46e5',
      progressColor: '#818cf8',
      cursorColor: '#4f46e5',
      barWidth: 2,
      barRadius: 3,
      height: 60,
      normalize: true,
    });

    wavesurfer.load(url);
    wavesurferRef.current = wavesurfer;

    wavesurfer.on('finish', () => {
      if (onFinish) onFinish();
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        wavesurferRef.current.play();
      } else {
        wavesurferRef.current.pause();
      }
    }
  }, [isPlaying]);

  return <div ref={containerRef} className="w-full" />;
};
