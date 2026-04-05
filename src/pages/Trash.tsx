import { useAppStore } from '@/store/useAppStore';
import AppSidebar from '@/components/AppSidebar';
import UserMenu from '@/components/UserMenu';
import TrashContent from '@/components/TrashContent';
import { Archive, PanelLeftOpen } from 'lucide-react';

export default function Trash() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          <Archive size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Trash</span>
          <div className="flex-1" />
          <UserMenu />
        </div>
        <TrashContent />
      </div>
    </div>
  );
}
