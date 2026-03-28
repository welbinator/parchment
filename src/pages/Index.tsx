import AppSidebar from '@/components/AppSidebar';
import PageEditor from '@/components/PageEditor';
import ResizableSidebarWrapper from '@/components/ResizableSidebarWrapper';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

const Index = () => {
  const { enabled: resizableSidebar, loading: flagLoading } = useFeatureFlag('resizable-sidebar', true);

  // Don't render until we know which layout to use — prevents flash/swap on mount
  if (flagLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <PageEditor />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {resizableSidebar ? (
        <ResizableSidebarWrapper>
          <AppSidebar resizableSidebar />
        </ResizableSidebarWrapper>
      ) : (
        <AppSidebar />
      )}
      <PageEditor />
    </div>
  );
};

export default Index;
