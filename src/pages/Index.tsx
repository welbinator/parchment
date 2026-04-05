import AppSidebar from '@/components/AppSidebar';
import PageEditor from '@/components/PageEditor';
import KanbanView from '@/components/KanbanView';
import ResizableSidebarWrapper from '@/components/ResizableSidebarWrapper';
import { useViewStore } from '@/store/useViewStore';
import { useAppStore } from '@/store/useAppStore';

const Index = () => {
  const { viewMode } = useViewStore();
  const { sidebarOpen } = useAppStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ResizableSidebarWrapper enabled={true}>
        <AppSidebar resizableSidebar={true} />
      </ResizableSidebarWrapper>
      {viewMode === 'kanban' ? (
        <KanbanView />
      ) : (
        <PageEditor />
      )}
    </div>
  );
};

export default Index;
