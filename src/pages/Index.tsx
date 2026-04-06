import AppSidebar from '@/components/AppSidebar';
import PageEditor from '@/components/PageEditor';
import KanbanView from '@/components/KanbanView';
import ResizableSidebarWrapper from '@/components/ResizableSidebarWrapper';
import { useViewStore } from '@/store/useViewStore';
import { LayoutList, LayoutDashboard } from 'lucide-react';

const Index = () => {
  const { viewMode, setViewMode } = useViewStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Sidebar — hidden in board view */}
      {viewMode === 'list' && (
        <ResizableSidebarWrapper enabled>
          <AppSidebar resizableSidebar />
        </ResizableSidebarWrapper>
      )}

      {/* Main content */}
      {viewMode === 'kanban' ? <KanbanView /> : <PageEditor />}

      {/* Floating view toggle pill */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-0.5 bg-popover border border-border rounded-full shadow-lg px-1.5 py-1.5">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <LayoutList size={14} />
          <span className="hidden sm:inline">List</span>
        </button>
        <button
          onClick={() => setViewMode('kanban')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            viewMode === 'kanban'
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <LayoutDashboard size={14} />
          <span className="hidden sm:inline">Board</span>
        </button>
      </div>
    </div>
  );
};

export default Index;
