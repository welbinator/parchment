import { useState, useCallback } from 'react';
import type { BlockType } from '@/types';
import { blockTypeOptions } from '@/utils/blockContent';

interface UseSlashCommandOptions {
  groupBlocksEnabled: boolean;
  onSelect: (type: BlockType) => void;
  getTextContent: () => string;
}

export function useSlashCommand({ groupBlocksEnabled, onSelect, getTextContent }: UseSlashCommandOptions) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);

  const filteredOptions = blockTypeOptions.filter((o) => {
    if (o.type === 'group' && !groupBlocksEnabled) return false;
    return o.label.toLowerCase().includes(slashFilter);
  });

  const checkSlashTrigger = useCallback(() => {
    const text = getTextContent();
    if (text === '/') {
      setShowSlashMenu(true);
      setSlashFilter('');
      setSlashMenuIndex(0);
      return true;
    }
    if (showSlashMenu && text.startsWith('/')) {
      setSlashFilter(text.slice(1).toLowerCase());
      setSlashMenuIndex(0);
      return true;
    }
    if (showSlashMenu && !text.startsWith('/')) {
      setShowSlashMenu(false);
    }
    return false;
  }, [showSlashMenu, getTextContent]);

  /** Returns true if the key was consumed by the slash menu */
  const handleSlashKeyDown = useCallback((key: string): boolean => {
    if (!showSlashMenu) return false;

    if (key === 'Escape') {
      setShowSlashMenu(false);
      return true;
    }
    if (key === 'ArrowDown') {
      setSlashMenuIndex((i) => (i + 1) % Math.max(filteredOptions.length, 1));
      return true;
    }
    if (key === 'ArrowUp') {
      setSlashMenuIndex((i) => (i - 1 + Math.max(filteredOptions.length, 1)) % Math.max(filteredOptions.length, 1));
      return true;
    }
    if (key === 'Enter') {
      if (filteredOptions.length > 0) {
        const idx = Math.min(slashMenuIndex, filteredOptions.length - 1);
        onSelect(filteredOptions[idx].type);
      }
      return true;
    }
    return false;
  }, [showSlashMenu, filteredOptions, slashMenuIndex, onSelect]);

  const closeSlashMenu = useCallback(() => setShowSlashMenu(false), []);

  return {
    showSlashMenu,
    slashFilter,
    slashMenuIndex,
    filteredOptions,
    checkSlashTrigger,
    handleSlashKeyDown,
    closeSlashMenu,
  };
}
