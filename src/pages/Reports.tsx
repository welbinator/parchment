import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, FolderOpen, FileText, Key, Loader2 } from 'lucide-react';
import UserMenu from '@/components/UserMenu';

interface ReportData {
  unique_users: number;
  total_collections: number;
  total_pages: number;
  total_api_keys: number;
}

export default function Reports() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }

    supabase.functions.invoke('admin-reports').then(({ data, error }) => {
      if (error) setError('Access denied or failed to load reports.');
      else if (data?.error) setError(data.error);
      else setData(data as ReportData);
      setLoading(false);
    });
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const stats = [
    { label: 'Unique Users', value: data?.unique_users ?? 0, icon: Users },
    { label: 'Total Collections', value: data?.total_collections ?? 0, icon: FolderOpen },
    { label: 'Total Pages', value: data?.total_pages ?? 0, icon: FileText },
    { label: 'Total API Keys', value: data?.total_api_keys ?? 0, icon: Key },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Back to workspace
          </button>
          <UserMenu />
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold font-display mb-8">Admin Reports</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-center gap-3 mb-3">
                <s.icon size={20} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-4xl font-bold text-foreground">{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
