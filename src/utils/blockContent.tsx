import type { BlockType } from '@/types';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Code,
  Group,
} from 'lucide-react';

// --- Block type menu options ---

export const blockTypeOptions: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: <Type size={14} /> },
  { type: 'heading1', label: 'Heading 1', icon: <Heading1 size={14} /> },
  { type: 'heading2', label: 'Heading 2', icon: <Heading2 size={14} /> },
  { type: 'heading3', label: 'Heading 3', icon: <Heading3 size={14} /> },
  { type: 'bullet_list', label: 'Bullet List', icon: <List size={14} /> },
  { type: 'numbered_list', label: 'Numbered List', icon: <ListOrdered size={14} /> },
  { type: 'todo', label: 'To-do', icon: <CheckSquare size={14} /> },
  { type: 'quote', label: 'Quote', icon: <Quote size={14} /> },
  { type: 'divider', label: 'Divider', icon: <Minus size={14} /> },
  { type: 'code', label: 'Code', icon: <Code size={14} /> },
  { type: 'group', label: 'Group', icon: <Group size={14} /> },
];

// --- Block styles ---

export const blockStyles: Record<string, string> = {
  text: 'text-base text-foreground',
  heading1: 'text-3xl font-bold text-foreground font-display break-words',
  heading2: 'text-2xl font-semibold text-foreground font-display break-words',
  heading3: 'text-xl font-medium text-foreground font-display break-words',
  bullet_list: 'text-base text-foreground pl-4 before:content-["•"] before:absolute before:-left-0 before:text-primary relative',
  numbered_list: 'text-base text-foreground pl-4',
  todo: 'text-base text-foreground',
  quote: 'text-base italic text-muted-foreground border-l-2 border-primary pl-4',
  code: 'text-sm font-mono bg-muted px-3 py-2 rounded-md text-foreground',
};

// --- Roman numerals ---

export function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['m', 'cm', 'd', 'cd', 'c', 'xc', 'l', 'xl', 'x', 'ix', 'v', 'iv', 'i'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

// --- Styled JSON → HTML conversion ---

export function convertStyledJsonToHtml(content: string): string {
  if (!content || !content.trim().startsWith('[')) return content;
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return content;
    return parsed.map((item: any) => {
      if (typeof item === 'string') return item;
      if (typeof item !== 'object' || !item.text) return '';
      let html: string = item.text;
      if (item.bold) html = `<b>${html}</b>`;
      if (item.italic) html = `<i>${html}</i>`;
      if (item.underline) html = `<u>${html}</u>`;
      if (item.strikethrough) html = `<s>${html}</s>`;
      if (item.code) html = `<code>${html}</code>`;
      if (item.color) html = `<span style="color:${item.color}">${html}</span>`;
      if (item.link || item.href) html = `<a href="${item.link || item.href}" target="_blank" rel="noopener noreferrer">${html}</a>`;
      return html;
    }).join('');
  } catch {
    return content;
  }
}

// --- Auto-linkify ---

const URL_REGEX = /(?<!\S)(https?:\/\/[^\s<]+[^\s<.,;:!?)"'\]])/g;

export function autoLinkify(html: string): string {
  const parts: string[] = [];
  let lastIndex = 0;
  const tagRegex = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const before = html.slice(lastIndex, match.index);
    parts.push(before.replace(URL_REGEX, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'));
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
  }
  const remaining = html.slice(lastIndex);
  parts.push(remaining.replace(URL_REGEX, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'));

  return parts.join('');
}
