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
  groupId?: string | null;
}

export type PageType = 'blank' | 'notes' | 'roadmap' | 'checklist';

export interface Page {
  id: string;
  title: string;
  type: PageType;
  blocks: Block[];
  collectionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  icon?: string;
  createdAt: string;
}
