import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import { GripVertical, Trash2, Plus, Group, Pencil } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import BlockItem from './BlockItem';
import type { BlockType } from '@/types';

interface DbBlock {
  id: string;
  page_id: string;
  type: string;
  content: string;
  checked: boolean | null;
  list_start: boolean | null;
  position: number;
  created_at: string;
  group_id: string | null;
}

interface GroupStyle {
  bgColor?: string;
  borderColor?: string;
}

interface GroupBlockProps {
  block: DbBlock;
  pageId: string;
  childBlocks: DbBlock[];
  groupBlocksEnabled: boolean;
}

// Swatch options — null means "use default"
const BG_COLORS: { label: string; value: string | null; preview: string }[] = [
  { label: 'Default',     value: null,        preview: 'bg-muted/30' },
  { label: 'Slate',       value: 'hsl(225 15% 14%)',  preview: '' },
  { label: 'Red',         value: 'hsl(0 30% 14%)',    preview: '' },
  { label: 'Orange',      value: 'hsl(25 35% 13%)',   preview: '' },
  { label: 'Yellow',      value: 'hsl(48 35% 12%)',   preview: '' },
  { label: 'Green',       value: 'hsl(145 30% 11%)',  preview: '' },
  { label: 'Teal',        value: 'hsl(168 35% 11%)',  preview: '' },
  { label: 'Blue',        value: 'hsl(215 35% 13%)',  preview: '' },
  { label: 'Purple',      value: 'hsl(270 30% 14%)',  preview: '' },
  { label: 'Pink',        value: 'hsl(330 30% 13%)',  preview: '' },
];

const BORDER_COLORS: { label: string; value: string | null; preview: string }[] = [
  { label: 'Default',  value: null,                   preview: 'border-border' },
  { label: 'Slate',    value: 'hsl(225 15% 30%)',     preview: '' },
  { label: 'Red',      value: 'hsl(0 60% 40%)',       preview: '' },
  { label: 'Orange',   value: 'hsl(25 70% 40%)',      preview: '' },
  { label: 'Yellow',   value: 'hsl(48 70% 40%)',      preview: '' },
  { label: 'Green',    value: 'hsl(145 50% 35%)',     preview: '' },
  { label: 'Teal',     value: 'hsl(168 65% 38%)',     preview: '' },
  { label: 'Blue',     value: 'hsl(215 65% 45%)',     preview: '' },
  { label: 'Purple',   value: 'hsl(270 55% 45%)',     preview: '' },
  { label: 'Pink',     value: 'hsl(330 55% 45%)',     preview: '' },
];

function parseGroupStyle(content: string): GroupStyle {
  if (!content || !content.trim().startsWith('{')) return {};
  try {
    return JSON.parse(content) as GroupStyle;
  } catch {
    return {};
  }
}

function ColorSwatch({
  color,
  label,
  selected,
  onClick,
}: {
  color: string | null;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
        selected ? 'border-primary scale-110' : 'border-transparent'
      }`}
      style={
        color
          ? { backgroundColor: color }
          : { backgroundColor: 'transparent', borderColor: selected ? undefined : 'hsl(var(--border))' }
      }
    >
      {!color && (
        <span className="flex items-center justify-center w-full h-full text-[8px] text-muted-foreground font-mono leading-none">
          ∅
        </span>
      )}
    </button>
  );
}

export default function GroupBlock({ block, pageId, childBlocks, groupBlocksEnabled }: GroupBlockProps) {
  const { addBlock, deleteGroup, updateBlock } = useAppStore();
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [stylePopoverOpen, setStylePopoverOpen] = useState(false);

  const groupStyle = parseGroupStyle(block.content);

  const handleDeleteGroup = useCallback(async () => {
    await deleteGroup(pageId, block.id);
    toast('Group deleted');
  }, [deleteGroup, pageId, block.id]);

  const handleAddChildBlock = useCallback(() => {
    const lastChild = childBlocks[childBlocks.length - 1];
    const newId = addBlock(pageId, lastChild?.id ?? null, 'text', block.id);
    setFocusBlockId(newId);
  }, [addBlock, pageId, block.id, childBlocks]);

  const handleStyleChange = useCallback((key: 'bgColor' | 'borderColor', value: string | null) => {
    const next: GroupStyle = { ...groupStyle };
    if (value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
    updateBlock(pageId, block.id, { content: Object.keys(next).length > 0 ? JSON.stringify(next) : '' });
  }, [groupStyle, updateBlock, pageId, block.id]);

  const sortedChildren = [...childBlocks].sort((a, b) => a.position - b.position);

  // Dynamic styles — fall back to CSS classes when no custom value set
  const containerStyle: React.CSSProperties = {};
  if (groupStyle.bgColor) containerStyle.backgroundColor = groupStyle.bgColor;
  if (groupStyle.borderColor) containerStyle.borderColor = groupStyle.borderColor;

  return (
    <div
      className={`group/group relative border rounded-lg p-4 transition-colors ${
        !groupStyle.bgColor ? 'bg-muted/30 hover:bg-muted/50' : ''
      } ${!groupStyle.borderColor ? 'border-border' : ''}`}
      style={containerStyle}
    >
      {/* Group label badge */}
      <div className="flex items-center gap-1 mb-3 opacity-0 group-hover/group:opacity-100 transition-opacity absolute -top-3 left-3">
        <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-0.5 text-xs text-muted-foreground shadow-sm">
          <Group size={10} />
          <span>Group</span>
        </div>
      </div>

      {/* Toolbar row: drag handle | style picker | delete */}
      <div className="flex items-center justify-between mb-2 opacity-0 group-hover/group:opacity-100 transition-opacity">
        <button className="p-0.5 text-muted-foreground hover:text-foreground cursor-grab">
          <GripVertical size={14} />
        </button>

        <div className="flex items-center gap-1">
          {/* Style popover */}
          <Popover open={stylePopoverOpen} onOpenChange={setStylePopoverOpen}>
            <PopoverTrigger asChild>
              <button className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors">
                <Pencil size={12} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <div className="space-y-3">
                {/* Background color */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Background</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BG_COLORS.map((c) => (
                      <ColorSwatch
                        key={c.label}
                        color={c.value}
                        label={c.label}
                        selected={
                          c.value === null
                            ? !groupStyle.bgColor
                            : groupStyle.bgColor === c.value
                        }
                        onClick={() => handleStyleChange('bgColor', c.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Border color */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Border</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BORDER_COLORS.map((c) => (
                      <ColorSwatch
                        key={c.label}
                        color={c.value}
                        label={c.label}
                        selected={
                          c.value === null
                            ? !groupStyle.borderColor
                            : groupStyle.borderColor === c.value
                        }
                        onClick={() => handleStyleChange('borderColor', c.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 size={12} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete group?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the group and all {sortedChildren.length} block{sortedChildren.length !== 1 ? 's' : ''} inside it. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteGroup}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete group
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Child blocks */}
      <div className="space-y-3">
        {sortedChildren.length === 0 ? (
          <p className="text-sm text-muted-foreground/50 italic px-2">
            Empty group — add a block below
          </p>
        ) : (
          sortedChildren.map((child, index) => {
            let listIndex = 0;
            if (child.type === 'numbered_list') {
              if (child.list_start) {
                listIndex = 0;
              } else {
                let start = index;
                while (
                  start > 0 &&
                  sortedChildren[start - 1].type === 'numbered_list' &&
                  !sortedChildren[start].list_start
                ) start--;
                listIndex = index - start;
              }
            }
            return (
              <BlockItem
                key={child.id}
                block={{
                  id: child.id,
                  type: child.type as BlockType,
                  content: child.content,
                  checked: child.checked ?? undefined,
                  listStart: child.list_start ?? undefined,
                  groupId: child.group_id,
                }}
                pageId={pageId}
                listIndex={listIndex}
                focusBlockId={focusBlockId}
                onFocusHandled={() => setFocusBlockId(null)}
                onNewBlock={(id) => setFocusBlockId(id)}
                groupId={block.id}
                groupBlocksEnabled={groupBlocksEnabled}
              />
            );
          })
        )}
      </div>

      {/* Add block inside group */}
      <button
        onClick={handleAddChildBlock}
        className="flex items-center gap-1 mt-3 px-2 py-1 text-xs text-muted-foreground/50 hover:text-muted-foreground rounded transition-colors"
      >
        <Plus size={12} />
        Add block to group
      </button>
    </div>
  );
}
