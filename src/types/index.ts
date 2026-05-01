export type BlockType = 
  | 'text' 
  | 'heading1' 
  | 'heading2' 
  | 'heading3' 
  | 'bullet_list' 
  | 'numbered_list' 
  | 'todo' 
  | 'quote' 
  | 'divider' 
  | 'code'
  | 'group';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  listStart?: boolean;
  indentLevel?: number;
  groupId?: string | null;
}

export type PageType = 'blank' | 'notes' | 'roadmap' | 'checklist';
