import { useState, useRef, useEffect, useCallback } from 'react';

interface EditableNameProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
}

export default function EditableName({ value, onSave, className = '' }: EditableNameProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();

      // On mobile, tapping elsewhere may not fire blur reliably.
      // Listen for any touch/click outside to close.
      const handleOutsideInteraction = (e: Event) => {
        if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
          inputRef.current.blur();
        }
      };
      // Use a small delay so the opening touch doesn't immediately close it
      const timer = setTimeout(() => {
        document.addEventListener('touchstart', handleOutsideInteraction, true);
        document.addEventListener('mousedown', handleOutsideInteraction, true);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('touchstart', handleOutsideInteraction, true);
        document.removeEventListener('mousedown', handleOutsideInteraction, true);
      };
    }
  }, [editing]);

  const startEditing = useCallback(() => {
    setEditValue(value);
    setEditing(true);
  }, [value]);

  const save = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
    if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  // Long press for mobile
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      startEditing();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`bg-input border border-border rounded px-1 py-0 text-sm outline-none focus:ring-1 focus:ring-ring ${className}`}
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation();
        startEditing();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`truncate flex-1 select-none ${className}`}
      title="Double-click to rename"
    >
      {value}
    </span>
  );
}
