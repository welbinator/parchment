import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, FolderOpen, FileText, Key, Loader2, ChevronLeft } from 'lucide-react';
import UserMenu from '@/components/UserMenu';

interface ReportData {
  unique_users: number;
  total_collections: number;
  total_pages: number;
  total_api_keys: number;
}

interface UserRecord {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  collections_count: number;
  pages_count: number;
  last_active: string | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Reports() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<UserRecord[] | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

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

  const loadUsers = async () => {
    setUsersLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-reports', {
      body: { report: 'users' },
    });
    if (!error && data?.users) {
      setUsersList(data.users);
    }
    setUsersLoading(false);
  };

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
    { key: 'users', label: 'Unique Users', value: data?.unique_users ?? 0, icon: Users, clickable: true },
    { key: 'collections', label: 'Total Collections', value: data?.total_collections ?? 0, icon: FolderOpen, clickable: false },
    { key: 'pages', label: 'Total Pages', value: data?.total_pages ?? 0, icon: FileText, clickable: false },
    { key: 'api_keys', label: 'Active API Keys', value: data?.total_api_keys ?? 0, icon: Key, clickable: false },
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

        {usersList ? (
          <div>
            <button
              onClick={() => setUsersList(null)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ChevronLeft size={16} />
              Back to overview
            </button>
            <h2 className="text-xl font-semibold mb-4">All Users ({usersList.length})</h2>
            <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Collections</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pages</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Active</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.user_id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                              {(u.display_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-medium text-foreground">{u.display_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{u.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-foreground font-medium">{u.collections_count}</td>
                      <td className="px-4 py-3 text-sm text-foreground font-medium">{u.pages_count}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{timeAgo(u.last_active)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((s) => (
              <div
                key={s.key}
                onClick={s.clickable ? loadUsers : undefined}
                className={`border border-border rounded-lg p-6 bg-card ${
                  s.clickable ? 'cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors' : ''
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <s.icon size={20} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-4xl font-bold text-foreground">{s.value.toLocaleString()}</p>
                {s.clickable && (
                  <p className="text-xs text-muted-foreground mt-2">Click to view details →</p>
                )}
              </div>
            ))}
          </div>
        )}

        {usersLoading && (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}
      </div>
    </main>
  );
}
