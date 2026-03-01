import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Copy, Check, Key, Shield, Download, Loader2 } from 'lucide-react';
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

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const ADMIN_EMAIL = 'james.welbes@gmail.com';
  const isAdmin = user?.email === ADMIN_EMAIL;

  // New key form
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

  const exportDatabase = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/export-database`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Export failed');
      }
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

        {/* API Keys Section */}
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

          {/* Revealed key banner */}
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

          {/* Create form */}
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
                <button
                  onClick={createKey}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Generate Key
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing keys */}
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
                  <button
                    onClick={() => revokeKey(k.id)}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                    title="Revoke key"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Admin: Export Database */}
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
