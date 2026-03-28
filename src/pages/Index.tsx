import AppSidebar from '@/components/AppSidebar';
import PageEditor from '@/components/PageEditor';
import ResizableSidebarWrapper from '@/components/ResizableSidebarWrapper';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

const Index = () => {
  const resizableSidebar = useFeatureFlag('resizable-sidebar');

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
