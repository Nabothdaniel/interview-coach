'use client';
import { useCallback, useEffect, useState } from 'react';

/** Read-aloud (speech synthesis on the device's own voice). Voice INPUT lives in wavRecorder.ts / useVoiceEntry.ts. */

export interface SpeechOutput { supported: boolean; speaking: boolean; speak: (text: string) => void; cancel: () => void }

export function useSpeechOutput(lang = 'en-NG'): SpeechOutput {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => { setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window); return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }; }, []);
  const cancel = useCallback(() => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); setSpeaking(false); }, []);
  const speak = useCallback((text: string): void => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || text.trim() === '') return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, [lang]);
  return { supported, speaking, speak, cancel };
}
