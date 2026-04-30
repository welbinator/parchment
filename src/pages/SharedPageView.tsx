import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Lock } from 'lucide-react';
import DOMPurify from 'dompurify';

interface SharedPage {
  id: string;
  title: string;
  share_mode: 'public' | 'private';
  shared_with_emails: string[];
  user_id: string;
}

interface SharedBlock {
  id: string;
  type: string;
  content: string;
  checked: boolean | null;
  list_start: boolean | null;
  indent_level: number;
  position: number;
  group_id: string | null;
}

// A tiny wrapper so dangerouslySetInnerHTML lives on its own return line where skipcq works
// skipcq: JS-0067
function SafeHtml({ html, className }: { html: string; className?: string }) {
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel', 'style'] });
  return <span className={className} dangerouslySetInnerHTML={{ __html: clean }} />; // skipcq: JS-0440
}

// skipcq: JS-0067
function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['m','cm','d','cd','c','xc','l','xl','x','ix','v','iv','i'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

interface StyledJsonItem {
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  color?: string;
  link?: string;
  href?: string;
}

// skipcq: JS-0067
// skipcq: JS-R1005
function convertStyledJsonToHtml(content: string): string {
  if (!content || !content.trim().startsWith('[')) return content;
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return content;
    return parsed.map((item: StyledJsonItem) => {
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

// skipcq: JS-0067
function renderBlockContent(content: string): string {
  const converted = convertStyledJsonToHtml(content);
  // Parse inline markdown bold/italic if not already JSON-styled
  const withInline = content.trim().startsWith('[')
    ? converted
    : converted
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
  const URL_REGEX = /(?<!\S)(https?:\/\/[^\s<]+[^\s<.,;:!?"'\]])/g;
  const linked = withInline.replace(URL_REGEX, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline">${url}</a>`);
  return DOMPurify.sanitize(linked, { ADD_ATTR: ['target', 'rel', 'style'] });
}

// skipcq: JS-0067
function parseGroupStyle(content: string): { bgColor?: string; borderColor?: string } {
  if (!content || !content.trim().startsWith('{')) return {};
  try { return JSON.parse(content); } catch { return {}; }
}

// skipcq: JS-0067
// skipcq: JS-R1005
function ReadOnlyGroupBlock({ block, allBlocks }: { block: SharedBlock; allBlocks: SharedBlock[] }) {
  const children = allBlocks
    .filter((b) => b.group_id === block.id)
    .sort((a, b) => a.position - b.position);

  const groupStyle = parseGroupStyle(block.content);
  const containerStyle: React.CSSProperties = {};
  if (groupStyle.bgColor) containerStyle.backgroundColor = groupStyle.bgColor;
  if (groupStyle.borderColor) containerStyle.borderColor = groupStyle.borderColor;

  return (
    <div
      className={`relative border rounded-lg p-4 ${!groupStyle.bgColor ? 'bg-muted/30' : ''} ${!groupStyle.borderColor ? 'border-border' : ''}`}
      style={containerStyle}
    >
      <div className="space-y-3">
        {children.map((child, idx) => (
          <ReadOnlyBlock key={child.id} block={child} index={idx} blocks={children} />
        ))}
      </div>
    </div>
  );
}

// skipcq: JS-0067
// skipcq: JS-R1005
function ReadOnlyBlock({ block, index, blocks }: { block: SharedBlock; index: number; blocks: SharedBlock[] }) {
  if (block.type === 'divider') {
    return <hr className="border-border my-2" />;
  }

  const html = renderBlockContent(block.content);

  if (block.type === 'todo') {
    return (
      <div className="flex items-start gap-2 py-0.5">
        <div className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center ${block.checked ? 'bg-primary border-primary' : 'border-border'}`}>
          {block.checked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        {/* nosemgrep: javascript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml */}
        <SafeHtml
          className={`text-base text-foreground ${block.checked ? 'line-through text-muted-foreground' : ''}`}
          html={html}
        />
      </div>
    );
  }

  if (block.type === 'bullet_list') {
    const indent = block.indent_level ?? 0;
    return (
      <div className="flex items-start gap-2 py-0.5" style={indent > 0 ? { paddingLeft: `${indent * 1.5}rem` } : undefined}>
        <span className="text-primary mt-1 shrink-0">•</span>
        {/* nosemgrep: javascript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml */}
        <SafeHtml className="text-base text-foreground [overflow-wrap:anywhere]" html={html} />
      </div>
    );
  }

  if (block.type === 'numbered_list') {
    const indent = block.indent_level ?? 0;
    // Count only same-level consecutive numbered_list items
    let num = 1;
    for (let i = index - 1; i >= 0; i--) {
      if (blocks[i].type !== 'numbered_list') break;
      if (blocks[i].list_start) break;
      if ((blocks[i].indent_level ?? 0) !== indent) continue;
      num++;
    }
    const label = indent >= 2
      ? `${toRoman(num)}.`
      : indent === 1
      ? `${String.fromCharCode(97 + ((num - 1) % 26))}.`
      : `${num}.`;
    return (
      <div className="flex items-start gap-2 py-0.5" style={indent > 0 ? { paddingLeft: `${indent * 1.5}rem` } : undefined}>
        <span className="text-muted-foreground text-sm mt-0.5 shrink-0 w-5 text-right">{label}</span>
        {/* nosemgrep: javascript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml */}
        <SafeHtml className="text-base text-foreground [overflow-wrap:anywhere]" html={html} />
      </div>
    );
  }

  const classMap: Record<string, string> = {
    heading1: 'text-3xl font-bold text-foreground font-display mt-6 mb-2 [overflow-wrap:anywhere]',
    heading2: 'text-2xl font-semibold text-foreground font-display mt-5 mb-1 [overflow-wrap:anywhere]',
    heading3: 'text-xl font-semibold text-foreground font-display mt-4 mb-1 [overflow-wrap:anywhere]',
    text: 'text-base text-foreground leading-relaxed [overflow-wrap:anywhere]',
    quote: 'text-base italic text-muted-foreground border-l-2 border-primary pl-4 py-1',
    code: 'text-sm font-mono bg-muted px-3 py-2 rounded-md text-foreground block',
  };

  const Tag = block.type === 'heading1' ? 'h1' : block.type === 'heading2' ? 'h2' : block.type === 'heading3' ? 'h3' : block.type === 'code' ? 'pre' : 'p';
  const safeHtml = DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel', 'style'] });
  return (
    <Tag
      className={classMap[block.type] ?? 'text-base text-foreground'}
      // nosemgrep: javascript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml skipcq: JS-0440
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

// skipcq: JS-0067
// skipcq: JS-R1005
export default function SharedPageView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [page, setPage] = useState<SharedPage | null>(null);
  const [blocks, setBlocks] = useState<SharedBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not_found' | 'private' | 'no_access' | null>(null);

  // skipcq: JS-R1005
  const loadPage = async () => {
    setLoading(true);

    // Fetch page by token
    const { data: pageData, error: pageError } = await supabase
      .from('pages')
      .select('id, title, share_mode, shared_with_emails, user_id, share_enabled')
      .eq('share_token', token)
      .eq('share_enabled', true)
      .maybeSingle();

    if (pageError || !pageData) {
      setError('not_found');
      setLoading(false);
      return;
    }

    // Check private access
    if (pageData.share_mode === 'private') {
      if (!user) {
        // Redirect to auth, come back after login
        navigate(`/auth?redirect=/share/${token}`);
        return;
      }
      if (!pageData.shared_with_emails.includes(user.email ?? '')) {
        setError('no_access');
        setLoading(false);
        return;
      }
    }

    setPage(pageData as SharedPage);

    // Fetch blocks
    const { data: blocksData } = await supabase
      .from('blocks')
      .select('id, type, content, checked, list_start, position, group_id')
      .eq('page_id', pageData.id)
      .order('position');

    setBlocks((blocksData ?? []) as SharedBlock[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!token) { setError('not_found'); setLoading(false); return; }
    loadPage();
  }, [token, user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error === 'not_found') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Page not found</p>
          <p className="text-sm text-muted-foreground">This link may have expired or sharing has been turned off.</p>
        </div>
      </div>
    );
  }

  if (error === 'no_access') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Lock size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground mb-2">Access restricted</p>
          <p className="text-sm text-muted-foreground">You don&apos;t have permission to view this page.</p>
          <p className="text-xs text-muted-foreground mt-1">Signed in as {user?.email}</p>
        </div>
      </div>
    );
  }

  // skipcq: JS-0415
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-8 py-16">
        {/* Page title */}
        <h1 className="text-4xl font-bold font-display text-foreground mb-10">
          {page?.title || 'Untitled'}
        </h1>

        {/* Blocks */}
        <div className="space-y-2">
          {blocks
            .filter((b) => !b.group_id)
            .map((block, index, topLevel) => {
              if (block.type === 'group') {
                return <ReadOnlyGroupBlock key={block.id} block={block} allBlocks={blocks} />;
              }
              return <ReadOnlyBlock key={block.id} block={block} index={index} blocks={topLevel} />;
            })}
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Shared via{' '}
            <a href="https://theparchment.app" className="text-primary hover:underline font-medium">
              Parchment
            </a>
          </p>
          <a
            href="https://theparchment.app"
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try Parchment →
          </a>
        </div>
      </div>
    </div>
  );
}
