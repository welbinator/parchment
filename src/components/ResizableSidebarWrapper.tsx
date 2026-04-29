import { useRef, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 256; // w-64
const STORAGE_KEY = 'parchment-sidebar-width';

interface Props {
  children: React.ReactNode;
  enabled: boolean;
}

export default function ResizableSidebarWrapper({ children, enabled }: Props) {
  const { sidebarOpen } = useAppStore();
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startWidth.current = width;
    setDragging(true);
  }, [width]);

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      setDragging(false);
      localStorage.setItem(STORAGE_KEY, String(width));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, width]);

  // Save width on release
  useEffect(() => {
    if (!dragging) {
      localStorage.setItem(STORAGE_KEY, String(width));
    }
  }, [dragging, width]);

  if (!sidebarOpen) return null;

  // When flag is off, just render children without any resizing logic
  if (!enabled) return <>{children}</>;

  return (
    <div className="relative flex-shrink-0 h-screen flex" style={{ width }}>
      {/* Sidebar content */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-40 group transition-colors ${
          dragging ? 'bg-primary/40' : 'hover:bg-primary/30'
        }`}
        style={{ userSelect: 'none' }}
      >
        {/* Visual indicator line */}
        <div className={`absolute inset-y-0 right-0 w-px transition-colors ${
          dragging ? 'bg-primary/60' : 'bg-sidebar-border group-hover:bg-primary/40'
        }`} />
      </div>

      {/* Drag overlay to prevent iframe/text selection issues */}
      {dragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize" style={{ userSelect: 'none' }} />
      )}
    </div>
  );
}
