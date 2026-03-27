import { useState } from 'react';
import { Share2, Globe, Lock, Copy, Check, X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShareSettings {
  share_enabled: boolean;
  share_mode: 'public' | 'private';
  share_token: string | null;
  shared_with_emails: string[];
}

interface ShareButtonProps {
  pageId: string;
  shareSettings: ShareSettings;
  onUpdate: (settings: Partial<ShareSettings>) => void;
}

export default function ShareButton({ pageId, shareSettings, onUpdate }: ShareButtonProps) {
  const sharingEnabled = useFeatureFlag('page-sharing');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  if (!sharingEnabled) return null;

  const shareUrl = shareSettings.share_token
    ? `${window.location.origin}/share/${shareSettings.share_token}`
    : null;

  const toggleSharing = async () => {
    setSaving(true);
    let token = shareSettings.share_token;

    // Generate token if enabling for the first time
    if (!shareSettings.share_enabled && !token) {
      token = crypto.randomUUID();
    }

    const updates: Partial<ShareSettings> = {
      share_enabled: !shareSettings.share_enabled,
      share_token: token,
    };

    const { error } = await supabase
      .from('pages')
      .update(updates)
      .eq('id', pageId);

    if (error) {
      toast.error('Failed to update sharing settings');
    } else {
      onUpdate(updates);
    }
    setSaving(false);
  };

  const setMode = async (mode: 'public' | 'private') => {
    setSaving(true);
    const { error } = await supabase
      .from('pages')
      .update({ share_mode: mode })
      .eq('id', pageId);

    if (error) {
      toast.error('Failed to update share mode');
    } else {
      onUpdate({ share_mode: mode });
    }
    setSaving(false);
  };

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  const addEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) return;
    const updated = [...shareSettings.shared_with_emails, newEmail.trim().toLowerCase()];
    setSaving(true);
    const { error } = await supabase
      .from('pages')
      .update({ shared_with_emails: updated })
      .eq('id', pageId);

    if (error) {
      toast.error('Failed to add email');
    } else {
      onUpdate({ shared_with_emails: updated });
      setNewEmail('');
    }
    setSaving(false);
  };

  const removeEmail = async (email: string) => {
    const updated = shareSettings.shared_with_emails.filter(e => e !== email);
    setSaving(true);
    const { error } = await supabase
      .from('pages')
      .update({ shared_with_emails: updated })
      .eq('id', pageId);

    if (error) {
      toast.error('Failed to remove email');
    } else {
      onUpdate({ shared_with_emails: updated });
    }
    setSaving(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
          shareSettings.share_enabled
            ? 'bg-primary/10 text-primary hover:bg-primary/20'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        <Share2 size={13} />
        {shareSettings.share_enabled ? 'Shared' : 'Share'}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Popover */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Share page</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {shareSettings.share_enabled ? 'Sharing on' : 'Sharing off'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {shareSettings.share_enabled ? 'Anyone with the link can view' : 'Only you can see this page'}
                </p>
              </div>
              <button
                onClick={toggleSharing}
                disabled={saving}
                className={`relative w-10 h-5.5 rounded-full transition-colors ${
                  shareSettings.share_enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                {saving ? (
                  <Loader2 size={10} className="absolute inset-0 m-auto animate-spin text-white" />
                ) : (
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    shareSettings.share_enabled ? 'left-5' : 'left-0.5'
                  }`} />
                )}
              </button>
            </div>

            {shareSettings.share_enabled && (
              <>
                {/* Mode selector */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Who can view</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMode('public')}
                      className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md border transition-colors ${
                        shareSettings.share_mode === 'public'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Globe size={12} />
                      Anyone with link
                    </button>
                    <button
                      onClick={() => setMode('private')}
                      className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md border transition-colors ${
                        shareSettings.share_mode === 'private'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Lock size={12} />
                      Specific people
                    </button>
                  </div>
                </div>

                {/* Private email list */}
                {shareSettings.share_mode === 'private' && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Allowed emails</p>
                    {shareSettings.shared_with_emails.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {shareSettings.shared_with_emails.map(email => (
                          <div key={email} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/50 text-xs">
                            <span className="text-foreground truncate">{email}</span>
                            <button
                              onClick={() => removeEmail(email)}
                              className="text-muted-foreground hover:text-destructive transition-colors ml-2 shrink-0"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="user@example.com"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addEmail()}
                        className="flex-1 px-2 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={addEmail}
                        disabled={!newEmail.trim() || saving}
                        className="px-2 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">Must have a Parchment account</p>
                  </div>
                )}

                {/* Copy link */}
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
