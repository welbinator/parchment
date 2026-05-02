/**
 * Converts a styled JSON array (as stored in block content) into an HTML string.
 * This is the single source of truth for the frontend — shared by blockContent.tsx,
 * SharedPageView.tsx, and any other consumers.
 *
 * NOTE: The edge function at supabase/functions/api/index.ts contains its own copy
 * intentionally — it must remain self-contained.
 */

interface StyledJsonItem {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  color?: string;
  link?: string;
  href?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function convertStyledJsonToHtml(content: string): string {
  if (!content || !content.trim().startsWith('[')) return content;
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return content;
    return parsed
      .map((item: StyledJsonItem | string) => {
        if (typeof item === 'string') return escapeHtml(item);
        if (typeof item !== 'object' || !item.text) return '';
        let html: string = escapeHtml(item.text);
        if (item.bold) html = `<b>${html}</b>`;
        if (item.italic) html = `<i>${html}</i>`;
        if (item.underline) html = `<u>${html}</u>`;
        if (item.strikethrough) html = `<s>${html}</s>`;
        if (item.code) html = `<code>${html}</code>`;
        if (item.color) html = `<span style="color:${escapeHtml(item.color)}">${html}</span>`;
        if (item.link || item.href)
          html = `<a href="${escapeHtml(item.link || item.href || '')}" target="_blank" rel="noopener noreferrer">${html}</a>`;
        return html;
      })
      .join('');
  } catch {
    return content;
  }
}
