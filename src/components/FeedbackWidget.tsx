import { useState } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function FeedbackWidget({ className }: { className?: string } = {}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [contactOk, setContactOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Not logged in'); setSubmitting(false); return; }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-feedback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        message,
        contact_ok: contactOk,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to submit feedback');
      return;
    }

    setSubmitted(true);
    setMessage('');
    setContactOk(false);
    setTimeout(() => { setOpen(false); setSubmitted(false); }, 2500);
  };

  return (
    <div className={className ?? "fixed bottom-6 right-6 z-50"}>
      {/* Modal */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-14 right-0 w-80 bg-popover border border-border rounded-xl shadow-xl z-50 p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Share feedback</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">🙏</p>
                <p className="text-sm font-medium text-foreground">Thanks for the feedback!</p>
                <p className="text-xs text-muted-foreground mt-1">It means a lot.</p>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Submitting as <span className="text-foreground">{user.email}</span></p>
                </div>

                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="What's on your mind? Bug reports, ideas, complaints — all welcome."
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none text-foreground placeholder:text-muted-foreground/50"
                />

                <label className="flex items-start gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactOk}
                    onChange={e => setContactOk(e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">You can contact me about this feedback</span>
                </label>

                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || submitting}
                  className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {submitting ? 'Sending...' : 'Send feedback'}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 text-sm font-medium"
      >
        <MessageSquare size={15} />
        Feedback
      </button>
    </div>
  );
}
