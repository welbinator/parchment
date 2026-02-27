import { useEffect, useState, useRef, useCallback } from 'react';
import { Bold, Italic, Strikethrough, Link, Palette } from 'lucide-react';

const COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: 'hsl(0 65% 52%)' },
  { label: 'Orange', value: 'hsl(30 80% 55%)' },
  { label: 'Yellow', value: 'hsl(45 90% 55%)' },
  { label: 'Green', value: 'hsl(140 60% 48%)' },
  { label: 'Blue', value: 'hsl(210 70% 55%)' },
  { label: 'Purple', value: 'hsl(270 60% 60%)' },
  { label: 'Pink', value: 'hsl(330 65% 60%)' },
];

interface FloatingToolbarProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onContentChange: () => void;
}

export default function FloatingToolbar({ containerRef, onContentChange }: FloatingToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showColors, setShowColors] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const isTouchDevice = useCallback(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const updatePosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setVisible(false);
      setShowColors(false);
      return;
    }

    // Check if selection is within our container
    const range = selection.getRangeAt(0);
    if (!containerRef.current?.contains(range.commonAncestorContainer)) {
      setVisible(false);
      setShowColors(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    const isTouch = isTouchDevice();
    setPosition({
      // On touch devices, show below selection to avoid native context menu
      top: isTouch
        ? rect.bottom - containerRect.top + 8
        : rect.top - containerRect.top - 44,
      left: rect.left - containerRect.left + rect.width / 2,
    });
    setVisible(true);
  }, [containerRef, isTouchDevice]);

  useEffect(() => {
    document.addEventListener('selectionchange', updatePosition);
    return () => document.removeEventListener('selectionchange', updatePosition);
  }, [updatePosition]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    onContentChange();
    // Keep selection alive
    setTimeout(updatePosition, 0);
  };

  const handleBold = (e: React.MouseEvent) => {
    e.preventDefault();
    execCommand('bold');
  };

  const handleItalic = (e: React.MouseEvent) => {
    e.preventDefault();
    execCommand('italic');
  };

  const handleStrikethrough = (e: React.MouseEvent) => {
    e.preventDefault();
    execCommand('strikeThrough');
  };

  const handleLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    // Check if already a link
    const anchorNode = selection.anchorNode;
    const parentLink = anchorNode?.parentElement?.closest('a');
    if (parentLink) {
      execCommand('unlink');
      return;
    }

    const selectedText = selection.toString();
    const url = prompt('Enter URL:', selectedText.startsWith('http') ? selectedText : 'https://');
    if (url) {
      execCommand('createLink', url);
      // Make links open in new tab
      const container = containerRef.current;
      if (container) {
        container.querySelectorAll('a').forEach((a) => {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        });
      }
    }
  };

  const handleColor = (e: React.MouseEvent, color: string) => {
    e.preventDefault();
    if (color === '') {
      execCommand('removeFormat');
    } else {
      execCommand('foreColor', color);
    }
    setShowColors(false);
  };

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg px-1 py-1 animate-fade-in"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        onMouseDown={handleBold}
        className="p-1.5 rounded hover:bg-accent text-popover-foreground transition-colors"
        title="Bold"
      >
        <Bold size={14} />
      </button>
      <button
        onMouseDown={handleItalic}
        className="p-1.5 rounded hover:bg-accent text-popover-foreground transition-colors"
        title="Italic"
      >
        <Italic size={14} />
      </button>
      <button
        onMouseDown={handleStrikethrough}
        className="p-1.5 rounded hover:bg-accent text-popover-foreground transition-colors"
        title="Strikethrough"
      >
        <Strikethrough size={14} />
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      <button
        onMouseDown={handleLink}
        className="p-1.5 rounded hover:bg-accent text-popover-foreground transition-colors"
        title="Link"
      >
        <Link size={14} />
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      <div className="relative">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setShowColors(!showColors);
          }}
          className="p-1.5 rounded hover:bg-accent text-popover-foreground transition-colors"
          title="Text color"
        >
          <Palette size={14} />
        </button>
        {showColors && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-popover border border-border rounded-lg shadow-lg p-2 flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.label}
                onMouseDown={(e) => handleColor(e, c.value)}
                className="w-5 h-5 rounded-full border border-border hover:scale-110 transition-transform"
                style={{
                  backgroundColor: c.value || 'hsl(var(--foreground))',
                }}
                title={c.label}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
