import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Copy, Check, Key, Shield, Download, Loader2, Flag, Globe, User } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  can_create_collections: boolean;
  can_delete_collections: boolean;
  can_create_pages: boolean;
  can_delete_pages: boolean;
  can_read_pages: boolean;
  can_write_blocks: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked: boolean;
}

const PERMISSIONS = [
  { key: 'can_read_pages', label: 'Read pages & blocks' },
  { key: 'can_create_collections', label: 'Create collections' },
  { key: 'can_delete_collections', label: 'Delete collections' },
  { key: 'can_create_pages', label: 'Create pages' },
  { key: 'can_delete_pages', label: 'Delete pages' },
  { key: 'can_write_blocks', label: 'Write blocks' },
] as const;

function generateSkillMd(keyName: string): string {
  return `---
name: parchment
description: Read, write, and organize notes in Parchment (theparchment.app). Use when creating collections, adding pages, writing blocks, or reading existing notes via the Parchment API.
---

# Parchment Skill

Parchment is a simple notes app with a REST-like API. Your API key is stored securely — never log or expose it.

## Base URL

\`\`\`
https://theparchment.app/functions/v1/api
\`\`\`

## Authentication

All requests require:
\`\`\`
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
\`\`\`

## API Key

This skill was generated for key: **${keyName}**

Store your API key as an environment variable or in your agent's secure config. Never hardcode it.

## Core Operations

### List all collections
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "list_collections"}'
\`\`\`

### Create a collection
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "create_collection", "name": "My Collection"}'
\`\`\`

### List pages in a collection
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "list_pages", "collection_id": "COLLECTION_ID"}'
\`\`\`

### Create a page
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "create_page",
    "collection_id": "COLLECTION_ID",
    "title": "My Page",
    "type": "blank"
  }'
\`\`\`

Page types: \`blank\`, \`notes\`, \`checklist\`, \`roadmap\`

### Read a page (with blocks)
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"action": "get_page", "page_id": "PAGE_ID"}'
\`\`\`

### Write blocks to a page (replaces all blocks)
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "replace_blocks",
    "page_id": "PAGE_ID",
    "blocks": [
      {"type": "heading1", "content": "My Heading"},
      {"type": "text", "content": "Some text here."},
      {"type": "todo", "content": "A task", "checked": false}
    ]
  }'
\`\`\`

### Append blocks to a page
\`\`\`bash
curl -X POST https://theparchment.app/functions/v1/api \\\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "action": "append_blocks",
    "page_id": "PAGE_ID",
    "blocks": [
      {"type": "text", "content": "Appended content"}
    ]
  }'
\`\`\`

## Block Types

| Type | Description |
|------|-------------|
| \`heading1\` | Large heading |
| \`heading2\` | Medium heading |
| \`heading3\` | Small heading |
| \`text\` | Body text |
| \`todo\` | Checkbox item (add \`"checked": true/false\`) |
| \`bullet\` | Bullet list item |
| \`quote\` | Blockquote |
| \`divider\` | Horizontal rule (content: "") |
| \`code\` | Code block |

## Full API Docs

Visit **https://theparchment.app/docs/api** for the complete API reference with all actions, parameters, and response formats.

## Tips for Agents

- Always \`list_collections\` first to get IDs before creating pages
- Use \`replace_blocks\` when you want to fully overwrite a page
- Use \`append_blocks\` when you want to add to existing content
- IDs are UUIDs — store them if you need to reference the same page later
- The API is append-friendly: create a collection once, add pages over time
`;
}

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Feature flags (admin only)
  interface FeatureFlag {
    id: string;
    flag: string;
    description: string | null;
    globally_enabled: boolean;
    enabled_for: string[];
  }
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [newFlagName, setNewFlagName] = useState('');
  const [newFlagDesc, setNewFlagDesc] = useState('');
  const [newFlagUserId, setNewFlagUserId] = useState('');

  const fetchFlags = async () => {
    setFlagsLoading(true);
    const { data } = await supabase.from('feature_flags').select('*').order('created_at', { ascending: true });
    setFlags((data as FeatureFlag[]) ?? []);
    setFlagsLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchFlags();
  }, [isAdmin]);

  const createFlag = async () => {
    if (!newFlagName.trim()) return;
    const { error } = await supabase.from('feature_flags').insert({
      flag: newFlagName.trim().toLowerCase().replace(/\s+/g, '-'),
      description: newFlagDesc.trim() || null,
      globally_enabled: false,
      enabled_for: [],
    });
    if (error) { toast.error('Failed to create flag'); return; }
    setNewFlagName('');
    setNewFlagDesc('');
    toast.success('Flag created');
    fetchFlags();
  };

  const deleteFlag = async (id: string) => {
    await supabase.from('feature_flags').delete().eq('id', id);
    toast.success('Flag deleted');
    fetchFlags();
  };

  const toggleGlobal = async (flag: FeatureFlag) => {
    await supabase.from('feature_flags').update({ globally_enabled: !flag.globally_enabled }).eq('id', flag.id);
    fetchFlags();
  };

  const addUserToFlag = async (flag: FeatureFlag) => {
    if (!newFlagUserId.trim()) return;
    const updated = [...flag.enabled_for, newFlagUserId.trim()];
    await supabase.from('feature_flags').update({ enabled_for: updated }).eq('id', flag.id);
    setNewFlagUserId('');
    fetchFlags();
  };

  const removeUserFromFlag = async (flag: FeatureFlag, userId: string) => {
    const updated = flag.enabled_for.filter(id => id !== userId);
    await supabase.from('feature_flags').update({ enabled_for: updated }).eq('id', flag.id);
    fetchFlags();
  };

  const ADMIN_EMAIL = 'james.welbes@gmail.com';
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [newName, setNewName] = useState('');
  const [newPerms, setNewPerms] = useState<Record<string, boolean>>({
    can_read_pages: true,
    can_create_collections: false,
    can_delete_collections: false,
    can_create_pages: false,
    can_delete_pages: false,
    can_write_blocks: false,
  });
  const [newExpiry, setNewExpiry] = useState('');

  useEffect(() => {
    loadKeys();
    if (searchParams.get('new') === 'true') {
      setCreating(true);
      setNewName('My Agent');
      setNewPerms({
        can_read_pages: true,
        can_create_collections: true,
        can_delete_collections: false,
        can_create_pages: true,
        can_delete_pages: false,
        can_write_blocks: true,
      });
    }
  }, []);

  const loadKeys = async () => {
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .eq('revoked', false)
      .order('created_at', { ascending: false });
    setKeys((data as ApiKey[]) ?? []);
    setLoading(false);
  };

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'pmt_';
    for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const hashKey = async (key: string) => {
    const encoded = new TextEncoder().encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createKey = async () => {
    if (!user) return;
    const rawKey = generateKey();
    const keyHash = await hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 8);

    const { error } = await supabase.from('api_keys').insert({
      user_id: user.id,
      name: newName || 'Untitled Key',
      key_hash: keyHash,
      key_prefix: keyPrefix,
      ...newPerms,
      expires_at: newExpiry ? new Date(newExpiry).toISOString() : null,
    });

    if (error) {
      toast.error('Failed to create key');
      return;
    }

    setNewKeyRevealed(rawKey);
    setCreating(false);
    setNewName('');
    setNewExpiry('');
    loadKeys();
    toast.success('API key created');
  };

  const revokeKey = async (id: string) => {
    await supabase.from('api_keys').update({ revoked: true }).eq('id', id);
    setKeys(keys.filter(k => k.id !== id));
    toast.success('Key revoked');
  };

  const copyKey = () => {
    if (newKeyRevealed) {
      navigator.clipboard.writeText(newKeyRevealed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadSkillMd = (keyName: string) => {
    const content = generateSkillMd(keyName);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parchment-skill.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SKILL.md downloaded');
  };

  const exportDatabase = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('You must be logged in'); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-database`,
        { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Export failed'); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parchment-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Database exported successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to editor
        </button>

        <h1 className="text-3xl font-bold font-display text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground mb-10">Manage your API keys and account.</p>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Key size={18} className="text-primary" />
              <h2 className="text-lg font-semibold font-display text-foreground">API Keys</h2>
            </div>
            <button
              onClick={() => { setCreating(true); setNewKeyRevealed(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              New Key
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Use API keys to access your Parchment data programmatically. Keys are shown once — store them securely.
          </p>

          {newKeyRevealed && (
            <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm font-medium text-foreground mb-2">
                🔑 Your new API key (copy it now — it won't be shown again):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-background/50 px-3 py-2 rounded border border-border break-all">
                  {newKeyRevealed}
                </code>
                <button onClick={copyKey} className="p-2 rounded hover:bg-accent transition-colors">
                  {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} className="text-muted-foreground" />}
                </button>
              </div>
            </div>
          )}

          {creating && (
            <div className="mb-6 p-4 rounded-lg border border-border bg-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Create API Key</h3>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Key name (e.g. 'My Bot')"
                className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground mb-3 outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="mb-3">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPerms[p.key] ?? false}
                        onChange={(e) => setNewPerms({ ...newPerms, [p.key]: e.target.checked })}
                        className="rounded border-border accent-primary"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Expiration (optional)</label>
                <input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md bg-background border border-border text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={createKey} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Generate Key
                </button>
                <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{k.name}</span>
                      <code className="text-xs font-mono text-muted-foreground">{k.key_prefix}...</code>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
                      {k.last_used_at && <span>Last used {new Date(k.last_used_at).toLocaleDateString()}</span>}
                      {k.expires_at && <span>Expires {new Date(k.expires_at).toLocaleDateString()}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {PERMISSIONS.filter(p => k[p.key]).map(p => (
                        <span key={p.key} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {p.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button
                      onClick={() => downloadSkillMd(k.name)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      title="Download SKILL.md for this key"
                    >
                      <Download size={12} />
                      SKILL.md
                    </button>
                    <button
                      onClick={() => revokeKey(k.id)}
                      className="p-1.5 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
                      title="Revoke key"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {isAdmin && (
          <section className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Flag size={18} className="text-primary" />
              <h2 className="text-lg font-semibold font-display text-foreground">Feature Flags</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Control which features are visible to which users. Deploy code with a flag, test it yourself, then roll it out globally when ready.
            </p>

            {/* Create new flag */}
            <div className="p-4 rounded-lg border border-border bg-card mb-6">
              <p className="text-sm font-medium mb-3">New Flag</p>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="flag-name (e.g. new-editor)"
                  value={newFlagName}
                  onChange={e => setNewFlagName(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newFlagDesc}
                  onChange={e => setNewFlagDesc(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={createFlag}
                  disabled={!newFlagName.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 w-fit"
                >
                  <Plus size={14} />
                  Create Flag
                </button>
              </div>
            </div>

            {/* Flag list */}
            {flagsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 size={14} className="animate-spin" /> Loading flags...
              </div>
            ) : flags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No flags yet.</p>
            ) : (
              <div className="space-y-3">
                {flags.map(flag => (
                  <div key={flag.id} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono font-medium text-foreground">{flag.flag}</code>
                          {flag.globally_enabled && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 font-medium">global</span>
                          )}
                        </div>
                        {flag.description && <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleGlobal(flag)}
                          title={flag.globally_enabled ? 'Disable for everyone' : 'Enable for everyone'}
                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${flag.globally_enabled ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                          <Globe size={11} />
                          {flag.globally_enabled ? 'On for all' : 'Off globally'}
                        </button>
                        <button
                          onClick={() => deleteFlag(flag.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Per-user list */}
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><User size={11} /> Enabled for specific users:</p>
                      {flag.enabled_for.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">None</p>
                      ) : (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {flag.enabled_for.map(uid => (
                            <span key={uid} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                              {uid.slice(0, 8)}…
                              <button onClick={() => removeUserFromFlag(flag, uid)} className="hover:text-destructive transition-colors">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Paste user UUID"
                          value={newFlagUserId}
                          onChange={e => setNewFlagUserId(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <button
                          onClick={() => addUserToFlag(flag)}
                          disabled={!newFlagUserId.trim()}
                          className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {isAdmin && (
          <section className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Download size={18} className="text-primary" />
              <h2 className="text-lg font-semibold font-display text-foreground">Export Database</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Download a full JSON export of all users, collections, pages, blocks, and API keys for migration.
            </p>
            <button
              onClick={exportDatabase}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {exporting ? 'Exporting...' : 'Export All Data'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
