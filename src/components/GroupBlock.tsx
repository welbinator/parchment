import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import { GripVertical, Trash2, Plus, Group } from 'lucide-react';
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

interface GroupBlockProps {
  block: DbBlock;
  pageId: string;
  childBlocks: DbBlock[];
  groupBlocksEnabled: boolean;
}

export default function GroupBlock({ block, pageId, childBlocks, groupBlocksEnabled }: GroupBlockProps) {
  const { addBlock, deleteGroup } = useAppStore();
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);

  const handleDeleteGroup = useCallback(async () => {
    await deleteGroup(pageId, block.id);
    toast('Group deleted');
  }, [deleteGroup, pageId, block.id]);

  const handleAddChildBlock = useCallback(() => {
    const lastChild = childBlocks[childBlocks.length - 1];
    const newId = addBlock(pageId, lastChild?.id ?? null, 'text', block.id);
    setFocusBlockId(newId);
  }, [addBlock, pageId, block.id, childBlocks]);

  const sortedChildren = [...childBlocks].sort((a, b) => a.position - b.position);

  return (
    <div className="group/group relative border border-border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
      {/* Group header */}
      <div className="flex items-center gap-1 mb-3 opacity-0 group-hover/group:opacity-100 transition-opacity absolute -top-3 left-3">
        <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-0.5 text-xs text-muted-foreground shadow-sm">
          <Group size={10} />
          <span>Group</span>
        </div>
      </div>

      {/* Drag handle + delete row */}
      <div className="flex items-center justify-between mb-2 opacity-0 group-hover/group:opacity-100 transition-opacity">
        <button className="p-0.5 text-muted-foreground hover:text-foreground cursor-grab">
          <GripVertical size={14} />
        </button>

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
