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
  | 'code';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
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
