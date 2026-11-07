'use client';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { IconButton } from './IconButton';

export interface ComposerProps { onSend: (text: string) => void; disabled?: boolean; placeholder?: string; maxLength?: number }

/** Chat input: Enter sends, Shift+Enter adds a line, grows with the text, shows a counter near the limit, and refocuses when it becomes available again. */
export function Composer({ onSend, disabled = false, placeholder = 'Type your answer', maxLength = 4000 }: ComposerProps) {
  const [value, setValue] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);
  useEffect(() => { if (!disabled) box.current?.focus(); }, [disabled]);

  const send = (): void => {
    if (disabled || value.trim() === '') return;
    onSend(value);
    setValue('');
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };
  const nearLimit = value.length >= maxLength * 0.8;
  return (
    <>
      <div className="ui-composer">
        <label className="ui-sr" htmlFor="ui-composer-input">Your message</label>
        <textarea ref={box} id="ui-composer-input" rows={1} value={value} maxLength={maxLength} disabled={disabled} placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)} onKeyDown={onKey} />
        <IconButton icon="send" label="Send (Enter)" tipAlign="end" solid large disabled={disabled || value.trim() === ''} onClick={send} />
      </div>
      <p className="ui-composer__hint" aria-live="polite">
        {nearLimit ? `${value.length} / ${maxLength} characters` : 'Enter to send · Shift+Enter for a new line'}
      </p>
    </>
  );
}
