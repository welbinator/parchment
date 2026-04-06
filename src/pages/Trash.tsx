import { useAppStore } from '@/store/useAppStore';
import { useViewStore } from '@/store/useViewStore';
import AppSidebar from '@/components/AppSidebar';
import UserMenu from '@/components/UserMenu';
import TrashContent from '@/components/TrashContent';
import { Archive, PanelLeftOpen, LayoutList, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Trash() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { setViewMode } = useViewStore();
  const navigate = useNavigate();

  const switchToBoard = () => {
    setViewMode('kanban');
    navigate('/app');
  };

  const switchToList = () => {
    setViewMode('list');
    navigate('/app');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
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

        {/* Content constrained to page-width container */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-12">
            <TrashContent />
          </div>
        </div>
      </div>

      {/* Floating view toggle pill — same as Index */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-0.5 bg-popover border border-border rounded-full shadow-lg px-1.5 py-1.5">
        <button
          onClick={switchToList}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors bg-primary text-white shadow-sm"
        >
          <LayoutList size={14} />
          <span className="hidden sm:inline">List</span>
        </button>
        <button
          onClick={switchToBoard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <LayoutDashboard size={14} />
          <span className="hidden sm:inline">Board</span>
        </button>
      </div>
    </div>
  );
}
